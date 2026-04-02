import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Stethoscope, Pill, Lock, Mail, ArrowRight, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('doctor'); // 'doctor' or 'pharmacist'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password } 
        : { email, password, role, firstName, lastName };
        
      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      login(response.data.user, response.data.token);
      
      if (response.data.user.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/pharmacy');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e27] relative overflow-hidden font-sans">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00d2d3]/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#54a0ff]/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 p-1"
      >
        <div className="bg-[#0f142d]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d2d3] to-[#0abde3] flex items-center justify-center shadow-[0_0_25px_rgba(0,210,211,0.5)] mb-4"
            >
              <Stethoscope className="w-10 h-10 text-[#0a0e27]" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00d2d3] to-[#54a0ff]">
              Prescripto AI
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">Healthcare. Reimagined.</p>
          </div>

          {/* Role Toggle */}
          {!isLogin && (
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mb-8">
              <button
                onClick={() => setRole('doctor')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  role === 'doctor' ? 'bg-[#00d2d3] text-[#0a0e27] shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Stethoscope className="w-4 h-4" /> Doctor
              </button>
              <button
                onClick={() => setRole('pharmacist')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  role === 'pharmacist' ? 'bg-[#54a0ff] text-[#0a0e27] shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Pill className="w-4 h-4" /> Pharmacist
              </button>
            </div>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs font-medium mb-6 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#00d2d3] transition-colors" />
                  <input
                    type="text"
                    placeholder="First Name"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 focus:bg-white/[0.08] transition-all"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#00d2d3] transition-colors" />
                  <input
                    type="text"
                    placeholder="Last Name"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 focus:bg-white/[0.08] transition-all"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#00d2d3] transition-colors" />
              <input
                type="email"
                placeholder="Medical Email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 focus:bg-white/[0.08] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#00d2d3] transition-colors" />
              <input
                type="password"
                placeholder="Secure Password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00d2d3]/50 focus:bg-white/[0.08] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#00d2d3] to-[#54a0ff] hover:opacity-90 text-[#0a0e27] font-bold py-4 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0a0e27]/30 border-t-[#0a0e27] rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Sign In to Portal' : 'Register for Access'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-sm text-gray-400 mt-8 hover:text-white transition-colors decoration-[#00d2d3] underline-offset-4 hover:underline"
          >
            {isLogin ? "Don't have an account? Request Access" : "Already registered? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
