import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { signIn, getSession } from '../../services/supabase_db.js'

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, go straight to dashboard
  useEffect(() => {
    getSession().then(session => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-16 select-none">
      {/* Mobile-first card container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden"
      >
        {/* Subtle decorative purple glow background inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/35 py-1 px-3 rounded-full text-brand-300 text-xs font-semibold font-display mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Admin Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
            ReviewFlow AI
          </h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your restaurant dashboard</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@violetorchid.com"
                required
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all select-text"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all select-text"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 0 20px rgba(118, 32, 191, 0.4)' }}
            whileTap={loading ? {} : { scale: 0.98 }}
            className="w-full mt-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl py-3.5 px-6 font-display font-bold text-sm tracking-wide shadow-lg border border-brand-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Redirect Link */}
        <div className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
            Sign Up
          </Link>
        </div>

        {/* Info */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 w-full text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-display block mb-1">
            Supabase Auth
          </span>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in with your registered Supabase credentials. This is a live authentication system.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
