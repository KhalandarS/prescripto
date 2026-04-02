import os
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from deepgram import DeepgramClient, AsyncDeepgramClient
from deepgram.core.events import EventType
import json
from database import save_consultation, get_all_consultations, get_consultation, update_consultation_status

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Deepgram Client
deepgram = DeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))
async_deepgram = AsyncDeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))

STRUCTURED_PROMPT = """
You are a senior medical assistant AI. Analyze the following doctor-patient conversation and extract a structured prescription.

Return ONLY a single valid JSON object. Do not include any conversational text, explanations, or notes outside the JSON.
IF NO MEDICATIONS ARE DISCUSSED, return the medications list as empty, DO NOT skip the field.

Format:
{{
  "patient_summary": "Brief 1-line summary",
  "symptoms": ["symptom1", ...],
  "diagnosis": "Primary diagnosis",
  "medications": [
    {{"name": "...", "dosage": "...", "frequency": "...", "duration": "..."}}
  ],
  "advice": ["advice1", ...],
  "ai_suggestions": ["suggestion1", ...]
}}

Conversation:
{conversation}
"""

class Conversation(BaseModel):
    text: str

class PrescriptionApproval(BaseModel):
    consultation_id: int
    prescription: dict
    doctor_notes: str = ""

# ─── PAGES ───────────────────────────────────────────────
@app.get("/")
def home():
    return FileResponse("index.html")

# ─── AUDIO TRANSCRIPTION ────────────────────────────────
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            return {"error": "Uploaded file is empty"}

        payload = {"buffer": audio_bytes}
        if file.content_type:
            payload["mimetype"] = file.content_type

        response = deepgram.listen.v1.media.transcribe_file(
            request=audio_bytes, model="nova-2", smart_format=True
        )
        transcript = response.results.channels[0].alternatives[0].transcript
        return {"transcription": transcript}
    except Exception as e:
        return {"error": str(e)}

# ─── STRUCTURED PRESCRIPTION GENERATION ──────────────────
@app.post("/generate-prescription")
async def generate_prescription(convo: Conversation):
    try:
        prompt = STRUCTURED_PROMPT.format(conversation=convo.text)
        response = await gemini_client.aio.models.generate_content(
            model="gemini-1.5-flash", contents=prompt,
        )
        
        if not response.text:
            return {"error": "AI returned an empty response. This might be due to safety filters."}

        raw_text = response.text.strip()
        # More robust JSON extraction
        if "```" in raw_text:
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()
            else:
                raw_text = raw_text.strip()

        prescription = json.loads(raw_text)
        return {"prescription": prescription}
    except json.JSONDecodeError as e:
        print(f"JSON Error: {e}\nRaw Content: {response.text}")
        return {"prescription": response.text, "format": "text"}
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"error": str(e)}

# ─── DOCTOR APPROVAL ────────────────────────────────────
@app.post("/approve-prescription")
def approve_prescription(approval: PrescriptionApproval):
    try:
        update_consultation_status(approval.consultation_id, "approved", approval.doctor_notes)
        return {"message": "Prescription approved successfully", "id": approval.consultation_id}
    except Exception as e:
        return {"error": str(e)}

# ─── PATIENT HISTORY ────────────────────────────────────
@app.get("/history")
def get_history():
    try:
        records = get_all_consultations()
        return {"consultations": records}
    except Exception as e:
        return {"error": str(e)}

@app.get("/history/{consultation_id}")
def get_history_detail(consultation_id: int):
    try:
        record = get_consultation(consultation_id)
        if record:
            return {"consultation": record}
        return {"error": "Consultation not found"}
    except Exception as e:
        return {"error": str(e)}

# ─── LIVE STREAMING PIPELINE ────────────────────────────
@app.websocket("/listen")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    transcript_parts = []
    
    try:
        async with async_deepgram.listen.v1.connect(
            model="nova-2",
            smart_format="true",
            language="en-US"
        ) as connection:
            # IMPORTANT: We must start the listener task to process incoming Deepgram messages
            import asyncio
            listen_task = asyncio.create_task(connection.start_listening())

            async def on_open(*args, **kwargs):
                print("DEBUG: Deepgram WebSocket Opened")

            async def on_message(result, **kwargs):
                print(f"DEBUG: Received message type: {type(result)}")
                if not hasattr(result, 'channel'):
                    # Could be Metadata, SpeechStarted, etc.
                    return
                
                try:
                    sentence = result.channel.alternatives[0].transcript
                    if len(sentence) == 0:
                        return
                    # Check for speech final or is_final depending on requirements
                    is_final = getattr(result, 'is_final', False)
                    speech_final = getattr(result, 'speech_final', False)
                    
                    if is_final or speech_final:
                        print(f"DEBUG: Final Transcript snippet: {sentence}")
                        transcript_parts.append(sentence)
                        try:
                            await websocket.send_json({"type": "transcript", "text": sentence})
                        except Exception as e:
                            print(f"Failed to send transcript to client: {e}")
                except Exception as e:
                    print(f"Error processing message: {e}")

            async def on_error(err, **kwargs):
                print(f"DEBUG: Deepgram WebSocket Error: {err}")

            async def on_close(*args, **kwargs):
                print("DEBUG: Deepgram WebSocket Closed")

            connection.on(EventType.OPEN, on_open)
            connection.on(EventType.MESSAGE, on_message)
            connection.on(EventType.ERROR, on_error)
            connection.on(EventType.CLOSE, on_close)

            while True:
                msg = await websocket.receive()
                if "bytes" in msg and msg["bytes"]:
                    await connection.send_media(msg["bytes"])
                elif "text" in msg:
                    try:
                        parsed = json.loads(msg["text"])
                        if parsed.get("text") == "stop":
                            await connection.send_finalize()
                            break
                    except json.JSONDecodeError:
                        if msg["text"] == "stop":
                            await connection.send_finalize()
                            break
            
            # Wait for the listener task to finish processing any remaining results
            await listen_task

    except WebSocketDisconnect:
        print("Client disconnected from WebSocket.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        # Generate structured prescription from accumulated text
        full_text = " ".join(transcript_parts)
        if full_text.strip():
            try:
                await websocket.send_json({"type": "status", "text": "Analyzing conversation..."})
                
                prompt = STRUCTURED_PROMPT.format(conversation=full_text)
                gemini_response = await gemini_client.aio.models.generate_content(
                    model="gemini-1.5-flash", contents=prompt,
                )
                
                if not gemini_response.text:
                    raise Exception("AI returned empty response (safety filter?)")

                raw_text = gemini_response.text.strip()
                # More robust JSON extraction
                if "```" in raw_text:
                    raw_text = raw_text.split("```")[1]
                    if raw_text.startswith("json"):
                        raw_text = raw_text[4:].strip()
                    else:
                        raw_text = raw_text.strip()

                print(f"DEBUG: Extracted JSON: {raw_text[:100]}...")

                try:
                    prescription = json.loads(raw_text)
                except json.JSONDecodeError:
                    prescription = raw_text

                # Save to database
                ai_suggestions = prescription.get("ai_suggestions", []) if isinstance(prescription, dict) else []
                consultation_id = save_consultation(
                    patient_name="Unknown",
                    transcript=full_text,
                    prescription=prescription,
                    ai_suggestions=ai_suggestions,
                    status="pending"
                )

                await websocket.send_json({
                    "type": "prescription",
                    "data": prescription,
                    "consultation_id": consultation_id
                })
            except Exception as e:
                print(f"GENINI FATAL ERROR: {e}")
                import traceback
                traceback.print_exc()
                try:
                    await websocket.send_json({"type": "error", "text": f"Error: {str(e)}"})
                except:
                    pass


                
        try:
            await websocket.close()
        except:
            pass
