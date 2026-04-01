import os
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from deepgram import DeepgramClient

load_dotenv()

app = FastAPI()

# Gemini Client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Deepgram Client
deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

class Conversation(BaseModel):
    text: str

@app.get("/")
def home():
    return {"message": "AI Clinical Assistant is running"}

# 🔥 AUDIO TRANSCRIPTION ENDPOINT
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        
        if not audio_bytes:
            return {"error": "Uploaded file is empty"}

        payload = {"buffer": audio_bytes}
        if file.content_type:
            payload["mimetype"] = file.content_type

        # Use the correct v3.8.0 syntax for Deepgram
        response = deepgram.listen.prerecorded.v("1").transcribe_file(
            payload,
            {
                "model": "nova-2",
                "smart_format": True
            }
        )

        transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]

        return {"transcription": transcript}

    except Exception as e:
        return {"error": str(e)}
# 🔥 PRESCRIPTION GENERATION
@app.post("/generate-prescription")
def generate_prescription(convo: Conversation):
    try:
        prompt = f"""
        You are a medical assistant AI.
        Extract:
        - Symptoms
        - Diagnosis
        - Medications with dosage
        - Advice

        Return in clean structured format.

        Conversation:
        {convo.text}
        """

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return {"prescription": response.text}

    except Exception as e:
        return {"error": str(e)}
# 🔥 FULL PIPELINE (Audio → Text → Prescription)
@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    try:
        # Step 1: Read audio
        audio_bytes = await file.read()

        if not audio_bytes:
            return {"error": "Uploaded file is empty"}

        payload = {"buffer": audio_bytes}
        if file.content_type:
            payload["mimetype"] = file.content_type

        # Step 2: Deepgram → Transcription
        dg_response = deepgram.listen.prerecorded.v("1").transcribe_file(
            payload,
            {
                "model": "nova-2",
                "smart_format": True
            }
        )

        transcript = dg_response["results"]["channels"][0]["alternatives"][0]["transcript"]

        # Step 3: Gemini → Prescription
        prompt = f"""
        You are a medical assistant AI.

        Extract:
        - Symptoms
        - Diagnosis
        - Medications with dosage
        - Advice

        Return in clean structured format.

        Conversation:
        {transcript}
        """

        gemini_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return {
            "transcription": transcript,
            "prescription": gemini_response.text
        }

    except Exception as e:
        return {"error": str(e)}
