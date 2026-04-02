import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Stethoscope, LogOut, Search, Clock, CheckCircle2, 
  MapPin, Pill, Activity, User, ShieldCheck, Mail, Info, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PharmacyDashboard() {
  const { user, logout } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('finalized');

  useEffect(() => {
    fetchPrescriptions();
    const interval = setInterval(fetchPrescriptions, 10000); // Polling for new orders
    return () => clearInterval(interval);
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/prescriptions/generate`); // Need to update route for all finalized
      // Mocking data for now if route doesn't support list
      setPrescriptions([
        {
          id: 'rx-778',
          patient_name: 'Sarah Miller',
          diagnosis: 'Acute Bronchitis',
          status: 'finalized',
          signed_at: new Date(),
          Medications: [{ medication_name: 'Amoxicillin', dosage: '500mg', frequency: 'twice_daily' }]
        },
        {
          id: 'rx-779',
          patient_name: 'James Wilson',
          diagnosis: 'Hypertension',
          status: 'dispensed',
          signed_at: new Date(Date.now() - 3600000),
          Medications: [{ medication_name: 'Lisinopril', dosage: '10mg', frequency: 'once_daily' }]
        }
      ]);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleDispense = async (id) => {
    // API call to update status to 'dispensed'
    setPrescriptions(prev => prev.map(rx => rx.id === id ? { ...rx, status: 'dispensed' } : rx));
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-[#e0e6ed]">
      {/* Pharmacy Header */}
      <header className="h-[72px] border-b border-white/10 bg-[#0f142d]/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1dd1a1] to-[#10ac84] flex items-center justify-center shadow-2xl shadow-green-500/20">
            <Pill className="w-6 h-6 text-[#0a0e27]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PharmaLink Hub</h1>
            <p className="text-[10px] text-green-400 uppercase font-black tracking-widest leading-none">Pharmacy Network v2</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
            <div className="text-right">
              <p className="text-xs font-bold text-white">Central Pharmacy Branch</p>
              <p className="text-[10px] text-green-400 uppercase tracking-wide">ID: #44921</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center border border-green-400/40">
              <RefreshCw className="w-4 h-4 text-green-400" />
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all border border-white/5"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">Incoming Prescriptions</h2>
            <p className="text-gray-500 mt-1 font-medium">Real-time clinical dispatch queue</p>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {['finalized', 'dispensed'].map((stat) => (
              <button 
                key={stat}
                onClick={() => setFilter(stat)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${filter === stat ? 'bg-gradient-to-r from-[#1dd1a1] to-[#10ac84] text-[#0a0e27]' : 'text-gray-500 hover:text-white'}`}
              >
                {stat} Orders
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {prescriptions.filter(rx => rx.status === filter).map((rx) => (
              <motion.div 
                key={rx.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f142d]/80 border border-white/10 rounded-[40px] p-8 shadow-2xl hover:border-green-400/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-green-400/10 transition-colors">
                    <User className="w-6 h-6 text-gray-400 group-hover:text-green-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${rx.status === 'dispensed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
                    {rx.status}
                  </span>
                </div>

                <div className="space-y-1 mb-8">
                  <h3 className="text-xl font-bold text-white leading-none">{rx.patient_name}</h3>
                  <p className="text-gray-500 text-sm font-medium">{rx.diagnosis}</p>
                </div>

                <div className="space-y-4 mb-8">
                  {rx.Medications?.map((med, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{med.medication_name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{med.dosage} • {med.frequency}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-black text-gray-600 tracking-widest">
                    <Clock className="w-3 h-3" /> {new Date(rx.signed_at).toLocaleTimeString()}
                  </div>
                  {rx.status === 'finalized' && (
                    <button 
                      onClick={() => handleDispense(rx.id)}
                      className="bg-[#1dd1a1] text-[#0a0e27] text-[10px] font-black px-6 py-2.5 rounded-xl uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-green-500/20"
                    >
                      Fill Order
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {prescriptions.filter(rx => rx.status === filter).length === 0 && (
          <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-[40px]">
            <Info className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500 uppercase tracking-widest">No Active Orders</h3>
            <p className="text-gray-600 text-sm mt-2">The clinical queue is currently clear.</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1dd1a1]/50 to-transparent pointer-events-none" />
    </div>
  );
}
