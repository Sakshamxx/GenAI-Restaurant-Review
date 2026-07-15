import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareOff, Check, Heart, ArrowRight } from 'lucide-react'
import { addFeedback } from '../../services/supabase_db.js'
import { submitFeedbackToBackend } from '../../services/ai.js'

const COMPLAINT_TAGS = [
  'Food Quality',
  'Service Delay',
  'Staff Behaviour',
  'Cleanliness',
  'Billing Issue',
  'Noise Level',
  'Other'
];

export default function FeedbackForm() {
  const navigate = useNavigate();
  const restaurantName = sessionStorage.getItem('reviewflow_restaurant_name') || 'your restaurant';

  // Selections
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Populate draft complaint if navigated from Page 2's negative experience flow
    const draft = sessionStorage.getItem('reviewflow_draft_complaint');
    if (draft) {
      setComment(draft);
      // Clean up session storage
      sessionStorage.removeItem('reviewflow_draft_complaint');
    }
  }, []);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() && selectedTags.length === 0) return;

    let ratings = { food: 3, service: 3, ambience: 3 };
    const savedRatings = sessionStorage.getItem('reviewflow_ratings');
    if (savedRatings) ratings = JSON.parse(savedRatings);

    const restaurantId = sessionStorage.getItem('reviewflow_restaurant_id') || null;
    const tableId = sessionStorage.getItem('reviewflow_table_id') || 'Unknown Table';

    // Save and notify via backend
    if (restaurantId) {
      await addFeedback({
        restaurantId,
        category: selectedTags[0] || 'General',
        severity: selectedTags.length > 2 ? 'high' : 'medium',
        feedbackText: comment,
        feedbackCategories: selectedTags,
        ratingSummary: `Food: ${ratings.food}/5, Service: ${ratings.service}/5, Ambience: ${ratings.ambience}/5`
      });
    }

    setSubmitted(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-16 select-none">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden"
      >
        {/* Subtle decorative purple glow background inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {/* Header Title */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 py-1 px-3 rounded-full text-amber-300 text-xs font-semibold font-display mb-3">
                  <MessageSquareOff className="w-3.5 h-3.5" />
                  <span>Private Feedback</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
                  Feedback & Complaint
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  We apologize for falling short. Please tell us what happened so we can make it right.
                </p>
              </div>

              {/* Complaint Tags */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
                  Select Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {COMPLAINT_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <motion.button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`py-2 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-brand-500 text-white border-brand-400/30 glow-purple'
                            : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px] text-white" />}
                        <span>{tag}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Large Textarea */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
                  Your Message
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what happened..."
                  className="w-full min-h-[150px] glass-input rounded-2xl p-4 text-sm text-slate-200 leading-relaxed font-sans focus:ring-1 focus:ring-brand-500 resize-none select-text"
                  required
                />
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(118, 32, 191, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-2xl py-4 px-6 font-display font-bold text-sm tracking-wide shadow-lg border border-brand-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
              >
                <span>Submit Feedback</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          ) : (
            // Premium thank you message for complaint submission
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center text-center py-6 gap-5"
            >
              <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/30 rounded-full flex items-center justify-center text-brand-400 drop-shadow-[0_0_15px_rgba(118,32,191,0.3)]">
                <Heart className="w-8 h-8 fill-brand-500 text-brand-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-extrabold text-white">
                  Thank You for Your Feedback
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Your complaint has been submitted privately to the management of <strong>{restaurantName}</strong>. 
                  We review every issue and will follow up with our staff immediately to resolve this.
                </p>
              </div>
              <motion.button
                onClick={() => {
                  setComment('');
                  setSelectedTags([]);
                  setSubmitted(false);
                  // Navigate back to the review page, not to '/' which redirects to login
                  const rId = sessionStorage.getItem('reviewflow_restaurant_id');
                  navigate(rId ? `/review/${rId}` : '/qr');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl py-2 px-5 text-xs font-semibold transition-all cursor-pointer"
              >
                Return to rating
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
