import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react'
import { db } from '../../services/db.js'

export default function GoogleSuccess() {
  const navigate = useNavigate();
  const settings = db.getSettings();
  const [countdown, setCountdown] = useState(4);

  // Read Google URL and review text from sessionStorage (set by AISuggestions on submit)
  const googleUrl = sessionStorage.getItem('reviewflow_google_url') || settings.googleReviewUrl;
  const copiedReview = sessionStorage.getItem('reviewflow_copied_review') || '';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-open Google Review page after countdown
          if (googleUrl) {
            window.open(googleUrl, '_blank');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [googleUrl]);

  const handleManualRedirect = () => {
    if (googleUrl) {
      window.open(googleUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-16 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 flex flex-col items-center text-center gap-6 relative overflow-hidden"
      >
        {/* Subtle decorative purple glow background inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-display font-extrabold text-white">
            Redirecting to Google
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Your review was copied to your clipboard. We are redirecting you to Google Reviews for <strong>{settings.restaurantName}</strong>.
          </p>
        </div>

        {/* Clipboard copy helper text */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 w-full flex flex-col gap-1.5 text-left">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-display">
            Quick Instructions
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            1. We've opened Google Reviews page.<br/>
            2. Simply **paste** your generated review.<br/>
            3. Select **5 stars** and hit publish!
          </p>
        </div>

        {/* Countdown Indicator or Manual Link */}
        <div className="w-full">
          {countdown > 0 ? (
            <div className="text-xs text-slate-400 font-semibold font-display tracking-wider uppercase mb-1">
              Redirecting in {countdown} seconds...
            </div>
          ) : (
            <div className="text-xs text-brand-300 font-semibold font-display tracking-wider uppercase mb-1">
              Opening review window...
            </div>
          )}

          <motion.button
            onClick={handleManualRedirect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl py-3.5 px-6 font-display font-bold text-sm tracking-wide shadow-lg border border-brand-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Proceed to Google Reviews</span>
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>

        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 rounded-xl py-2 px-5 text-xs font-semibold transition-all cursor-pointer"
        >
          Rate another experience
        </motion.button>

      </motion.div>
    </div>
  );
}
