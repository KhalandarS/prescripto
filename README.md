# Prescripto AI

Prescripto AI is an intelligent clinical assistant that provides real-time medical transcription, AI-powered prescription generation, and automated Text-to-Speech (TTS) feedback for healthcare professionals.

## 🚀 Running the Application

This project consists of a **Node.js/Express Backend** and a **React/Vite Frontend**.

### 1. Backend (Node.js)
The backend handles real-time audio transcription (via Deepgram) and AI analysis (via Gemini).

```bash
cd backend
npm install
npm run dev
```
*The backend runs on `http://localhost:5000`*

### 2. Frontend (React)
The frontend provides a modern, high-performance interface for clinicians.

```bash
cd frontend
npm install
npm run dev
```
*The frontend runs on `http://localhost:5173` (default)*

---

## 🛠️ Configuration

Ensure you have a `.env` file in the `backend/` directory with the following keys:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
JWT_SECRET=your_secret_key
```

## 🔋 Features
- **Real-time Transcription**: Clinical conversation capture with high accuracy.
- **Smart Prescription**: Automatic structured extraction of diagnosis and medications.
- **AI Consultation**: Context-aware clinical suggestions.
- **TTS Feedback**: Voice-enabled synthesis of prescription summaries.

## 📦 Python Version (Alternative)
A standalone Python version is also available in the root directory:
```bash
# In the root 'prescripto' directory
python main.py
```
*This serves the `index.html` file in the root.*
