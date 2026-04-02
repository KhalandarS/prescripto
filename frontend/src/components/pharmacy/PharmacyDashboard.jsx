import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  Pill, Search, Bell, CheckCircle, Clock, User, 
  ChevronRight, Package, ArrowLeft, LogOut, 
  Calendar, Hash, Info, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PharmacyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRx, setPendingRx] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Socket Connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('Connected to socket');
      socket.emit('join:room', 'pharmacist');
    });

    socket.on('new_prescription', (rx) => {
      console.log('New Rx Received:', rx);
      setPendingRx(prev => [rx, ...prev]);
      
      // Add visual alert
      const newAlert = { ...rx, alertId: Date.now() };
      setAlerts(prev => [newAlert, ...prev]);
      
      // Auto-remove alert after 5 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.alertId !== newAlert.alertId));
      }, 5000);
    });

    return () => socket.disconnect();
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/prescriptions/pending/all');
      setPendingRx(response.data);
    } catch (err) {
      console.error('Fetch pending failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/prescriptions/search/all?query=${searchQuery}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const markAsDispensed = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/prescriptions/${id}/dispense`);
      setPendingRx(prev => prev.filter(rx => rx.id !== id));
      setSelectedRx(null);
      // Show success toast?
    } catch (err) {
      console.error('Dispense failed', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-[#e0e6ed] flex flex-col font-sans">
      {/* Real-time Alerts Layer */}
      <div className="fixed top-24 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.alertId}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="bg-[#1a1f3a]/90 backdrop-blur-xl border border-[#00d2d3]/30 p-4 rounded-2xl shadow-2xl pointer-events-auto w-80"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00d2d3]/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-[#00d2d3] animate-bounce" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">New Prescription!</p>
                  <p className="text-xs text-gray-400 mt-1">Patient: {alert.patient_name}</p>
                  <p className="text-[10px] text-[#00d2d3] mt-1 font-mono uppercase bg-[#00d2d3]/10 px-2 py-0.5 rounded w-fit">
                    ID: {alert.id?.slice(0, 8)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="h-[72px] shrink-0 border-b border-white/10 bg-[#0f142d]/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d2d3] to-[#54a0ff] flex items-center justify-center">
            <Pill className="w-6 h-6 text-[#0a0e27]" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] bg-clip-text text-transparent">
              Pharmacy Hub
            </h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Dispensing Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <div className="text-right">
              <p className="text-xs font-bold text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-[#54a0ff] capitalize">Licensed Pharmacist</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#54a0ff]/20 flex items-center justify-center border border-[#54a0ff]/40">
              <User className="w-4 h-4 text-[#54a0ff]" />
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-8 gap-8">
        {/* Left Column: List & Search */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
              <button 
                onClick={() => setIsSearching(false)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!isSearching ? 'bg-[#00d2d3] text-[#0a0e27] shadow-lg' : 'text-gray-400'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setIsSearching(true)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSearching ? 'bg-[#00d2d3] text-[#0a0e27] shadow-lg' : 'text-gray-400'}`}
              >
                Archive
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00d2d3] transition-colors" />
              <input 
                type="text" 
                placeholder="Search Patient Name or Record ID..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 focus:bg-white/[0.08] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {(isSearching ? searchResults : pendingRx).map((rx) => (
                  <motion.div
                    key={rx.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setSelectedRx(rx)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer group ${
                      selectedRx?.id === rx.id 
                        ? 'bg-[#00d2d3]/10 border-[#00d2d3]/30 shadow-2xl shadow-cyan-500/10' 
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rx.status === 'dispensed' ? 'bg-green-500/20' : 'bg-[#00d2d3]/20'}`}>
                          {rx.status === 'dispensed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-[#00d2d3]" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-[#00d2d3] transition-colors">{rx.patient_name || 'Anonymous'}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">#{rx.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-medium">{new Date(rx.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(rx.Medications || rx.medications || []).slice(0, 2).map((med, i) => (
                          <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-gray-300">
                            {med.medication_name || med.medicationName}
                          </span>
                        ))}
                        {(rx.Medications || rx.medications || []).length > 2 && (
                          <span className="text-[10px] text-gray-500 mt-1">+{rx.Medications.length - 2} more</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rx.status === 'dispensed' ? 'bg-green-500/20 text-green-500' : 'bg-[#00d2d3]/20 text-[#00d2d3]'
                      }`}>
                        {rx.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00d2d3] group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(!isSearching && pendingRx.length === 0 && !loading) && (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-600 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Package className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No pending prescriptions found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details Panel */}
        <div className="w-full md:w-[450px] shrink-0">
          <AnimatePresence mode="wait">
            {selectedRx ? (
              <motion.div
                key={selectedRx.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full bg-[#0f142d]/80 backdrop-blur-2xl border border-white/10 rounded-[40px] flex flex-col shadow-2xl relative overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-8 pb-6 border-b border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={() => setSelectedRx(null)}
                      className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-gray-400"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      selectedRx.status === 'dispensed' ? 'bg-green-500/20 text-green-500' : 'bg-[#00d2d3]/20 text-[#00d2d3]'
                    }`}>
                      {selectedRx.status}
                    </div>
                  </div>

                  <div className="flex items-end gap-6">
                    <div className="flex-1">
                      <p className="text-[10px] text-[#54a0ff] font-bold uppercase tracking-widest mb-1.5">Selected Patient</p>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedRx.patient_name || 'Anonymous Patient'}</h2>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Hash className="w-3.5 h-3.5" />
                          {selectedRx.id.slice(0, 12)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(selectedRx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medications List */}
                <div className="flex-1 p-8 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-4 h-4 text-[#00d2d3]" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Diagnosis & Notes</h3>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-sm italic text-[#00d2d3] mb-3">"{selectedRx.diagnosis}"</p>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                        {selectedRx.additional_notes || 'No secondary notes provided by consulting doctor.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-4 h-4 text-[#00d2d3]" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Required Medications ({(selectedRx.Medications || selectedRx.medications || []).length})</h3>
                    </div>
                    {(selectedRx.Medications || selectedRx.medications || []).map((med, i) => (
                      <div key={i} className="group bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/[0.08] transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-[#e0e6ed] group-hover:text-[#00d2d3] transition-colors">{med.medication_name || med.medicationName}</h4>
                          <span className="text-[10px] bg-[#00d2d3]/20 text-[#00d2d3] px-2 py-0.5 rounded-full font-bold">{med.dosage}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Frequency</span>
                            <span className="text-gray-300 font-medium">{med.frequency}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Duration</span>
                            <span className="text-gray-300 font-medium">{med.duration_days || med.durationDays} Days</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <p className="text-xs text-[#54a0ff] leading-relaxed">
                            <span className="font-bold">Instructions:</span> {med.instructions || 'Standard pharmaceutical guidelines apply.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-8 pt-6 border-t border-white/5 bg-[#0a0e27]/40 backdrop-blur-md">
                  {selectedRx.status !== 'dispensed' ? (
                    <button 
                      onClick={() => markAsDispensed(selectedRx.id)}
                      className="w-full bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] hover:opacity-90 text-[#0a0e27] font-bold py-4 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 group"
                    >
                      <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Complete Delivery & Save
                    </button>
                  ) : (
                    <div className="w-full h-[60px] bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border border-green-500/20">
                      <CheckCircle className="w-5 h-5" />
                      Dispensed successfully
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-6">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Info className="w-10 h-10 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-400">Select a Prescription</p>
                  <p className="text-xs text-gray-600 mt-2">Pick an item from the left to view<br />full medical details and dosage.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default PharmacyDashboard;
