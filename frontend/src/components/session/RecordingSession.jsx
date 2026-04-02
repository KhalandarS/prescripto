import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Square, FileText, CheckCircle2, Activity, RotateCw, 
  Volume2, Stethoscope, User, LogOut, ShieldCheck, AlertCircle, 
  Search, Info, Lock, ArrowRight, X
} from 'lucide-react';
import { socket } from '../../services/socket.service';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RecordingSession() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [result, setResult] = useState(null); // Holds { prescription, medications, reviewNotes, validityCheck }
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  
  // Signature Modal State
  const [isSigning, setIsSigning] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const transcriptRef = useRef([]);
  const lowAudioTimer = useRef(0);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const timerInterval = useRef(null);
  const transcriptEndRef = useRef(null);

  // Audio Monitoring State
  const [audioLevel, setAudioLevel] = useState(0);
  const [showLowAudioToast, setShowLowAudioToast] = useState(false);

  // Manual Medication State
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMedIndex, setEditingMedIndex] = useState(null);
  const [medForm, setMedForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'once_daily',
    duration_days: 7,
    instructions: ''
  });

  useEffect(() => {
    socket.on('connect', () => setStatus('Connected'));
    socket.on('disconnect', () => {
      setStatus('Disconnected');
      setIsRecording(false);
    });
    
    socket.on('transcript:chunk', (chunk) => {
      const newTranscript = [...transcriptRef.current, chunk];
      transcriptRef.current = newTranscript;
      setTranscript(newTranscript);
      setTimeout(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    socket.on('tts:audio', async (audioBuffer) => {
      try {
        setIsSpeaking(true);
        const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } catch (err) {
        console.error('TTS Playback error:', err);
        setIsSpeaking(false);
      }
    });
    
    socket.on('error', (err) => {
      setStatus(`Error: ${err}`);
      setIsProcessing(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('transcript:chunk');
      socket.off('tts:audio');
      socket.off('error');
    };
  }, []);

  const startRecording = async () => {
    if (!patientName.trim()) {
      alert("Please enter patient name before starting session.");
      return;
    }
    try {
      setTranscript([]);
      transcriptRef.current = [];
      setResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      processor.onaudioprocess = (e) => {
        if (!socket.connected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        let hasSignal = false;
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const val = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = val * 0x7FFF;
          sum += Math.abs(val);
          if (Math.abs(val) > 0.01) hasSignal = true;
        }
        
        // Calculate volume level for UI (0-100)
        const average = sum / inputData.length;
        const level = Math.min(100, Math.floor(average * 500));
        setAudioLevel(level);

        // Detect consistently low audio
        if (average < 0.005) { // Threshold for "too quiet"
          lowAudioTimer.current += 1;
          if (lowAudioTimer.current > 40) { // ~5 seconds at 4096 buffer/16k sample
            setShowLowAudioToast(true);
          }
        } else {
          lowAudioTimer.current = 0;
          setShowLowAudioToast(false);
        }
        
        if (hasSignal) {
          socket.emit('audio:stream', pcmData);
        } else if (Math.random() > 0.95) {
          socket.emit('audio:stream', pcmData);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      socket.connect();
      setStatus('Listening...');
      setIsRecording(true);
      
      setTimer(0);
      timerInterval.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      setStatus('No Mic Access');
    }
  };

  const stopRecording = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    clearInterval(timerInterval.current);
    setIsRecording(false);
    setStatus('Analyzing Consultation...');
    setIsProcessing(true);
    
    socket.emit('audio:stop');
    
    const currentTranscript = transcriptRef.current;
    const fullText = currentTranscript.map(t => t.text).join(' ');
    
    if (!fullText || !fullText.trim()) {
      setStatus('Ready');
      setIsProcessing(false);
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/prescriptions/generate`, {
        transcript: fullText,
        patientName,
        patientId: patientId || 'P-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        doctorId: user?.id
      });
      
      setResult(res.data);
      setStatus('Review Ready');

      if (res.data.prescription?.diagnosis) {
        speakText(`Advanced AI review complete. Clinical notes and pharmacological validity check are ready for your signature.`);
      }
    } catch (err) {
      console.error('Prescription error:', err);
      setStatus('Verification Failed');
    } finally {
      setIsProcessing(false);
    }
  }, [patientName, patientId, user]);

  const handleFinish = () => {
    setSessionCompleted(true);
    setStatus('Session Completed');
    setResult(null);
    setPatientName('');
    setPatientId('');
    setTimeout(() => setSessionCompleted(false), 3000);
  };

  const handleSaveMedication = (e) => {
    e.preventDefault();
    const updatedMedications = [...(result?.medications || [])];
    
    if (editingMedIndex !== null) {
      updatedMedications[editingMedIndex] = medForm;
    } else {
      updatedMedications.push(medForm);
    }

    setResult({ ...result, medications: updatedMedications });
    setShowMedModal(false);
    setEditingMedIndex(null);
  };

  const removeMedication = (index) => {
    const updatedMedications = [...result.medications];
    updatedMedications.splice(index, 1);
    setResult({ ...result, medications: updatedMedications });
  };

  const speakText = (text) => {
    if (text) {
      socket.emit('tts:speak', { text });
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen text-[#e0e6ed] bg-[#0a0e27]">
      {/* Role-Specific Header */}
      <header className="h-[72px] shrink-0 border-b border-white/10 bg-[#0f142d]/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d2d3] to-[#54a0ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,210,211,0.4)]">
            <Stethoscope className="w-6 h-6 text-[#0a0e27]" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] bg-clip-text text-transparent">
            Prescripto AI
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            <div className="text-right">
              <p className="text-xs font-bold text-white">Dr. {user?.lastName}</p>
              <p className="text-[10px] text-[#00d2d3] uppercase tracking-wide">Physician</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00d2d3]/20 flex items-center justify-center border border-[#00d2d3]/40">
              <User className="w-4 h-4 text-[#00d2d3]" />
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all border border-white/5"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-8 flex flex-col gap-6">
        {/* Success Toast */}
        <AnimatePresence>
          {sessionCompleted && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-cyan-500 text-[#0a0e27] px-6 py-3 rounded-2xl font-bold shadow-2xl shadow-cyan-500/20 flex items-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6" />
              Session Successfully Finalized
            </motion.div>
          )}

          {showLowAudioToast && isRecording && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-yellow-500 text-[#0a0e27] px-6 py-3 rounded-2xl font-bold shadow-2xl shadow-yellow-500/20 flex items-center gap-3"
            >
              <AlertCircle className="w-6 h-6" />
              Low Audio Detected - Patient voice may be unclear
            </motion.div>
          )}
        </AnimatePresence>

        {/* Patient Identity Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-end bg-white/5 p-6 rounded-3xl border border-white/10">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] text-[#00d2d3] font-bold uppercase tracking-widest ml-1">Patient Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              disabled={isRecording}
              className="w-full bg-[#0a0e27]/50 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 transition-all disabled:opacity-50"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-[10px] text-[#00d2d3] font-bold uppercase tracking-widest ml-1">Patient ID (Optional)</label>
            <input 
              type="text" 
              placeholder="Auto-generated if empty"
              disabled={isRecording}
              className="w-full bg-[#0a0e27]/50 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 transition-all disabled:opacity-50"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>
          <div className="flex items-center h-[52px]">
            <span className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isRecording ? 'border-red-500/30 bg-red-500/10 text-red-500' : 'border-white/10 bg-white/5 text-gray-500'}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Left Panel: Transcript */}
          <div className="flex-1 flex flex-col bg-[#141937]/50 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-[#00d2d3]/30">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-[#e0e6ed]">
                  <Activity className={`w-5 h-5 ${isRecording ? 'text-[#00d2d3] animate-pulse' : 'text-gray-500'}`} />
                  Live Consultation Transcript
                </h2>
                {isRecording && (
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                    <div className="w-[60px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: `${audioLevel}%` }}
                        className={`h-full ${audioLevel > 60 ? 'bg-green-400' : audioLevel > 20 ? 'bg-cyan-400' : 'bg-yellow-400'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
              <span className="font-mono text-[#00d2d3] text-xl">{formatTimer(timer)}</span>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto min-h-[200px] scrollbar-thin scrollbar-thumb-white/10">
              {transcript.length === 0 && !isRecording && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic space-y-6">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <Mic className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-400">Consultation Session</p>
                    <p className="text-xs text-gray-600 mt-2">Enter patient details above and<br/>click start to begin monitoring.</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {transcript.map((chunk, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm leading-relaxed text-[#c8d6e5]"
                  >
                    {chunk.text}
                  </motion.div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex items-center justify-center bg-[#0d1123]/50">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="group flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] text-[#0a0e27] font-bold rounded-2xl shadow-xl shadow-cyan-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
                  Begin Clinical Capture
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="group flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-[#ff6b6b] to-[#ee5a24] text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  <Square className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
                  Finalize Capture
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Prescription & Verification */}
          <div className="flex-1 flex flex-col bg-[#141937]/50 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-[#1dd1a1]/30">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[#e0e6ed]">
                <FileText className="w-5 h-5 text-[#1dd1a1]" />
                Prescription Analysis
              </h2>
              <div className="flex gap-4">
                {isProcessing && (
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#feca57]">
                    <RotateCw className="w-3 h-3 animate-spin" /> Extracting Clinical Data
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#00d2d3] animate-pulse">
                    <Volume2 className="w-3 h-3" /> Voice Summary
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {!result && !isProcessing && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 italic space-y-6">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <FileText className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-400">Analysis Preview</p>
                    <p className="text-xs text-gray-600 mt-2">Finish the session to view<br/>the extracted prescription.</p>
                  </div>
                </div>
              )}

              {result && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex items-center gap-3">
                    <Info className="w-5 h-5 text-cyan-400" />
                    <p className="text-xs text-cyan-200/70">Review and Edit medications if necessary before finalizing the report.</p>
                  </div>

                  {/* DRAFT RX SUMMARY */}
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-4">Patient Diagnosis</h3>
                    <p className="text-xl font-bold text-white mb-2">{result.prescription.diagnosis}</p>
                    <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Medications</h3>
                      <button 
                        onClick={() => {
                          setMedForm({ medication_name: '', dosage: '', frequency: 'once_daily', duration_days: 7, instructions: '' });
                          setEditingMedIndex(null);
                          setShowMedModal(true);
                        }}
                        className="text-[10px] uppercase font-bold text-[#1dd1a1] hover:text-white transition-colors bg-[#1dd1a1]/10 px-3 py-1 rounded-lg border border-[#1dd1a1]/20"
                      >
                        + Add Manually
                      </button>
                    </div>
                    {(result.medications || []).map((med, i) => (
                      <div key={i} className="group flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:border-[#1dd1a1]/30 transition-all">
                        <div className="flex-1">
                          <span className="font-bold text-[#1dd1a1] text-sm">{med.medication_name || med.medicationName}</span>
                          <p className="text-[10px] text-gray-400 mt-0.5">{med.dosage} • {med.frequency}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-gray-500">{med.duration_days || med.durationDays} Days</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setMedForm(med);
                                setEditingMedIndex(i);
                                setShowMedModal(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-blue-400"
                            >
                              <Lock className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => removeMedication(i)}
                              className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                </motion.div>
              )}
            </div>

            {result && (
              <div className="p-8 border-t border-white/5 flex gap-4 bg-[#0d1123]/50">
                 <button 
                   onClick={() => speakText(`Diagnosis identified: ${result.prescription.diagnosis}`)}
                   className="flex-1 p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
                 >
                    <Volume2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleFinish}
                  className="flex-[4] flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] text-[#0a0e27] font-bold rounded-2xl shadow-xl shadow-cyan-500/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" /> Finalize Consultation Report
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MANUAL MEDICATION MODAL */}
      <AnimatePresence>
        {showMedModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMedModal(false)}
              className="absolute inset-0 bg-[#0a0e27]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f142d] border border-white/10 rounded-[40px] shadow-2xl p-10"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingMedIndex !== null ? 'Edit Medication' : 'Add Medication Manually'}
              </h3>
              
              <form onSubmit={handleSaveMedication} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 font-bold uppercase">Medication Name</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:border-[#00d2d3]/50 transition-all outline-none"
                      value={medForm.medication_name}
                      onChange={(e) => setMedForm({ ...medForm, medication_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold uppercase">Dosage</label>
                    <input 
                      type="text"
                      placeholder="e.g. 500mg"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:border-[#00d2d3]/50 transition-all outline-none"
                      value={medForm.dosage}
                      onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold uppercase">Duration (Days)</label>
                    <input 
                      type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:border-[#00d2d3]/50 transition-all outline-none"
                      value={medForm.duration_days}
                      onChange={(e) => setMedForm({ ...medForm, duration_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold uppercase">Frequency</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:border-[#00d2d3]/50 transition-all outline-none"
                      value={medForm.frequency}
                      onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    >
                      <option value="once_daily">Once Daily</option>
                      <option value="twice_daily">Twice Daily</option>
                      <option value="three_times_daily">Three Times Daily</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500 font-bold uppercase">Special Instructions</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:border-[#00d2d3]/50 transition-all outline-none h-24 resize-none"
                    value={medForm.instructions}
                    onChange={(e) => setMedForm({ ...medForm, instructions: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowMedModal(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-gradient-to-r from-[#1dd1a1] to-[#10ac84] text-[#0a0e27] font-bold py-4 rounded-2xl transition-all shadow-xl shadow-green-500/20"
                  >
                    Save Medication
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
