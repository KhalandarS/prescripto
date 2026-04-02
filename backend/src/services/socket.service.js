const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

let ioInstance = null;

const socketService = (io) => {
  ioInstance = io;
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join role-based room
    socket.on('join:room', (role) => {
      if (role === 'pharmacist') {
        socket.join('pharmacy');
        console.log(`Socket ${socket.id} joined pharmacy room`);
      }
    });

    let dgConnection = null;
    let isReady = false;
    let audioQueue = [];
    
    socket.on('audio:stream', (audioChunk) => {
      if (!dgConnection) {
        try {
          console.log('Initializing Deepgram Live (PCM 16kHz)...');
          dgConnection = deepgram.listen.live({
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1,
            no_delay: true,
            interim_results: true,
            endpointing: 300,
            container: 'none'
          });

          dgConnection.on(LiveTranscriptionEvents.Open, () => {
            console.log('Deepgram connection opened successfully');
            isReady = true;
            while (audioQueue.length > 0) {
              const qChunk = audioQueue.shift();
              dgConnection.send(Buffer.from(qChunk));
            }
          });

          dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel?.alternatives[0]?.transcript;
            if (transcript && transcript.trim().length > 0) {
              socket.emit('transcript:chunk', {
                text: transcript,
                confidence: data.channel.alternatives[0].confidence,
                timestamp: data.start
              });
            }
          });

          dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
            console.error('CRITICAL Deepgram Error:', err);
            socket.emit('error', 'Transcription service error');
          });

          dgConnection.on(LiveTranscriptionEvents.Close, () => {
            console.log('Deepgram connection closed by server');
            isReady = false;
            dgConnection = null;
          });

          audioQueue.push(audioChunk);
        } catch (err) {
          console.error('Deepgram init failed:', err);
          socket.emit('error', 'Failed to initialize transcription');
        }
      } else if (isReady) {
        dgConnection.send(Buffer.from(audioChunk));
      } else {
        audioQueue.push(audioChunk);
      }
    });

    socket.on('tts:speak', async ({ text }) => {
      try {
        if (!text || text.trim().length === 0) return;
        const response = await deepgram.speak.v1.audio.generate(
          { text },
          { model: 'aura-asteria-en', encoding: 'mp3' }
        );
        const stream = await response.getStream();
        if (stream) {
          const buffer = await getBuffer(stream);
          socket.emit('tts:audio', buffer);
        }
      } catch (err) {
        console.error('TTS ERROR:', err);
      }
    });
    
    socket.on('audio:stop', () => {
      if (dgConnection) {
        try { dgConnection.finish(); } catch (e) {}
        dgConnection = null;
        isReady = false;
        audioQueue = [];
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (dgConnection) {
        try { dgConnection.finish(); } catch (e) {}
        dgConnection = null;
      }
    });
  });
};

const notifyPharmacy = (data) => {
  if (ioInstance) {
    console.log('Broadcasting to pharmacy room:', data.patient_name || data.patientName);
    ioInstance.to('pharmacy').emit('new_prescription', data);
  } else {
    console.warn('Socket IO instance not initialized for notifyPharmacy');
  }
};

async function getBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = socketService;
module.exports.notifyPharmacy = notifyPharmacy;
