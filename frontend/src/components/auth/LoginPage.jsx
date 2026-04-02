import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login(email, password);
      if (res.user.role === 'doctor') navigate('/doctor');
      else navigate('/pharmacy');
    } catch (err) {
      setError('Invalid clinical credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center p-6 bg-[overflow:hidden]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#0f142d]/80 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d2d3] to-[#54a0ff] flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6">
              <Stethoscope className="w-10 h-10 text-[#0a0e27]" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Prescripto AI</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-[0.2em]">Clinical Gateway</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-1">Secure Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#00d2d3] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#00d2d3]/50 transition-all font-medium placeholder-gray-600"
                  placeholder="doctor@prescripto.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest ml-1">Access Pin</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#00d2d3] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#00d2d3]/50 transition-all font-medium placeholder-gray-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> {error}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] text-[#0a0e27] font-black py-4 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              Authorize Secure Access <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] uppercase font-black text-gray-600 tracking-widest">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> HIPAA Compliant</span>
            <span>v2.4.0 Secure Node</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
