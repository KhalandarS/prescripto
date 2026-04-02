import asyncio
import os
from dotenv import load_dotenv
from deepgram import AsyncDeepgramClient
from deepgram.core.events import EventType

load_dotenv()

async def main():
    async_deepgram = AsyncDeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))

    try:
        print("Connecting...")
        async with async_deepgram.listen.v1.connect(
            model="nova-2",
            smart_format="true",
            language="en-US"
        ) as connection:
            print("Connected!")
            
            async def on_open(self, *args, **kwargs):
                print("Event: OPEN")
                
            async def on_message(self, result, **kwargs):
                print(f"Event: MESSAGE. Type: {type(result)}")
                try:
                    if hasattr(result, "channel"):
                        print(f"Transcript: {result.channel.alternatives[0].transcript}")
                except Exception as e:
                    print(f"Message parsing error: {e}")
                    
            async def on_error(self, err, **kwargs):
                print(f"Event: ERROR. {err}")
                
            async def on_close(self, *args, **kwargs):
                print("Event: CLOSE")

            connection.on(EventType.OPEN, on_open)
            connection.on(EventType.MESSAGE, on_message)
            connection.on(EventType.ERROR, on_error)
            connection.on(EventType.CLOSE, on_close)

            # Start listening
            listen_task = asyncio.create_task(connection.start_listening())

            # Send some silence or anything
            print("Sending audio...")
            await connection.send_media(b'\x00' * 8192)
            
            await asyncio.sleep(2)
            print("Sending finalize...")
            await connection.send_finalize()
            
            await listen_task

    except Exception as e:
        print(f"Main error: {e}")

asyncio.run(main())
