import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Edit3, CornerDownRight, Check } from 'lucide-react'
import { generateMockReviewSuggestions, classifySentiment } from '../../services/ai.js'
import { addReview, addFeedback, logActivity } from '../../services/supabase_db.js'

export default function AISuggestions() {
  const navigate = useNavigate();

  // Load from sessionStorage
  const [ratings, setRatings] = useState({ food: 5, service: 5, ambience: 5 });
  const [selectedTags, setSelectedTags] = useState({ food: [], service: [], ambience: [] });
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editableText, setEditableText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  // Sentiment prediction based on ratings and tags
  const [predictedSentiment, setPredictedSentiment] = useState(null);

  // Sentinel to track if a blank-page error occurred
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    // ─── Read sessionStorage with try/catch to prevent JSON.parse crashes ──
    let parsedRatings = { food: 5, service: 5, ambience: 5 };
    let parsedTags    = { food: [], service: [], ambience: [] };

    try {
      const savedRatings = sessionStorage.getItem('reviewflow_ratings');
      const savedTags    = sessionStorage.getItem('reviewflow_selected_tags');
      console.log('[AISuggestions] Loaded ratings:', savedRatings);
      console.log('[AISuggestions] Loaded tags:',    savedTags);
      if (savedRatings) parsedRatings = JSON.parse(savedRatings);
      if (savedTags)    parsedTags    = JSON.parse(savedTags);
    } catch (parseErr) {
      console.error('[AISuggestions] sessionStorage parse error:', parseErr);
      // continue with defaults — do not crash
    }

    setRatings(parsedRatings);
    setSelectedTags(parsedTags);

    const thresholdVal = parseFloat(
      sessionStorage.getItem('reviewflow_min_review_threshold') || '3.5'
    );
    console.log('[AISuggestions] Threshold:', thresholdVal);

    const classification = classifySentiment(parsedRatings, parsedTags, thresholdVal);
    console.log('[AISuggestions] Sentiment:', classification);
    setPredictedSentiment(classification);

    const restaurantId = sessionStorage.getItem('reviewflow_restaurant_id') || null;
    console.log('[AISuggestions] Calling generateMockReviewSuggestions for restaurant:', restaurantId);
    generateMockReviewSuggestions(parsedRatings, parsedTags, restaurantId)
      .then(result => {
        console.log('[AISuggestions] AI result:', result);
        // Validate result is a non-empty array of strings
        if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
          setSuggestions(result);
          setEditableText(result[0]);
        } else {
          console.warn('[AISuggestions] Unexpected result format, using emergency fallback');
          const fallback = _emergencyFallback(parsedRatings);
          setSuggestions(fallback);
          setEditableText(fallback[0]);
        }
      })
      .catch(err => {
        console.error('[AISuggestions] generateMockReviewSuggestions failed:', err);
        // NEVER leave the page blank — generate reviews client-side synchronously
        const fallback = _emergencyFallback(parsedRatings);
        setSuggestions(fallback);
        setEditableText(fallback[0]);
        setApiError('AI service unavailable. Using pre-generated suggestions.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSelectSuggestion = (index) => {
    setSelectedIndex(index);
    setEditableText(suggestions[index]);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    const restaurantId = sessionStorage.getItem('reviewflow_restaurant_id') || null;
    const restaurantName = sessionStorage.getItem('reviewflow_restaurant_name') || 'Unknown';
    const allTags = [...selectedTags.food, ...selectedTags.service, ...selectedTags.ambience];
    const overallRating = parseFloat(((ratings.food + ratings.service + ratings.ambience) / 3).toFixed(1));

    console.log('Restaurant:', { id: restaurantId, name: restaurantName });
    console.log('Rating:', overallRating, 'Ratings:', ratings);

    if (predictedSentiment && predictedSentiment.requiresPrivateFeedback) {
      // Negative sentiment → persist to Supabase feedback + navigate to form
      sessionStorage.setItem('reviewflow_draft_complaint', editableText);
      if (restaurantId) {
        await addFeedback({
          restaurantId,
          category: allTags[0] || 'General',
          severity: 'medium',
          feedbackText: editableText,
        });
      }
      navigate('/feedback');
    } else {
      // Positive → persist review to Supabase
      if (restaurantId) {
        await addReview({
          restaurantId,
          overallRating,
          foodRating: ratings.food,
          serviceRating: ratings.service,
          ambienceRating: ratings.ambience,
          reviewText: editableText,
          sentiment: predictedSentiment?.sentiment || 'POSITIVE',
          sentimentScore: predictedSentiment?.score || 1.0,
          redirectedToGoogle: true,
        });
      }

      // Read Google URL from session (set by QRScan from restaurant.google_review_link)
      const googleUrl = sessionStorage.getItem('reviewflow_google_url') || '';
      console.log('Redirect URL:', googleUrl);

      sessionStorage.setItem('reviewflow_copied_review', editableText);

      try {
        await navigator.clipboard.writeText(editableText);
        showToast('Review copied! Paste it into Google Reviews.', 'success');
      } catch (err) {
        showToast('Review ready! Proceeding to Google Reviews.', 'info');
      }

      // Open Google Reviews URL in the SAME tab after a short delay so toast is visible
      setTimeout(async () => {
        if (restaurantId) {
          await logActivity({
            restaurantId,
            activityType: 'google_redirect',
            customerName: 'Anonymous',
            rating: overallRating,
            reviewText: editableText
          });
        }
        if (googleUrl) {
          window.location.href = googleUrl;
        } else {
          navigate('/success');
        }
      }, 1500);
    }
  };

  // Manual Demo Routing Overrides
  const forcePositiveFlow = async () => {
    const restaurantId = sessionStorage.getItem('reviewflow_restaurant_id') || null;
    const overallRating = parseFloat(((ratings.food + ratings.service + ratings.ambience) / 3).toFixed(1));
    const googleUrl = sessionStorage.getItem('reviewflow_google_url') || '';

    console.log('Rating:', overallRating);
    console.log('Redirect URL:', googleUrl);

    if (restaurantId) {
      await addReview({
        restaurantId,
        overallRating,
        foodRating: ratings.food,
        serviceRating: ratings.service,
        ambienceRating: ratings.ambience,
        reviewText: editableText,
        sentiment: 'POSITIVE',
        sentimentScore: 0.95,
        redirectedToGoogle: true,
      });
    }

    sessionStorage.setItem('reviewflow_copied_review', editableText);
    try {
      await navigator.clipboard.writeText(editableText);
      showToast('Review copied! Paste it into Google Reviews.', 'success');
    } catch {
      showToast('Proceeding to Google Reviews.', 'info');
    }

    setTimeout(async () => {
      if (restaurantId) {
        await logActivity({
          restaurantId,
          activityType: 'google_redirect',
          customerName: 'Anonymous',
          rating: overallRating,
          reviewText: editableText
        });
      }
      if (googleUrl) {
        window.location.href = googleUrl;
      } else {
        navigate('/success');
      }
    }, 1200);
  };


  const forceNegativeFlow = () => {
    sessionStorage.setItem('reviewflow_draft_complaint', editableText);
    navigate('/feedback');
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-16 select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-50 flex items-center gap-2.5 bg-emerald-500/90 backdrop-blur-md text-white rounded-2xl py-3 px-5 shadow-2xl border border-emerald-400/30 text-sm font-semibold font-display"
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Error soft notice — shown but never blocks the review flow */}
      {apiError && (
        <div className="w-full max-w-xl mb-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl px-4 py-2.5 text-xs font-semibold text-center">
          {apiError}
        </div>
      )}

      {/* Main Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden"
      >
        {/* Subtle decorative purple glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title Block */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-brand-500/15 border border-brand-500/35 py-1 px-3 rounded-full text-brand-300 text-xs font-semibold font-display mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Review Assistant</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
            Review Suggestions
          </h1>
          <p className="text-sm text-slate-400 mt-1">Select a suggestion that matches your voice</p>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="min-h-[220px] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-semibold font-display tracking-widest uppercase">
              Drafting Reviews...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Suggestions list (Radio Group) */}
            <div className="flex flex-col gap-3">
              {Array.isArray(suggestions) && suggestions.length > 0 ? (
                suggestions.map((text, idx) => (
                  <SpotlightCard
                    key={idx}
                    isSelected={selectedIndex === idx}
                    onClick={() => handleSelectSuggestion(idx)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Active Radio Indicator */}
                      <div className="mt-1 flex-shrink-0">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          selectedIndex === idx 
                            ? 'border-brand-500 bg-brand-500/20' 
                            : 'border-slate-600'
                        }`}>
                          {selectedIndex === idx && (
                            <div className="w-2 h-2 rounded-full bg-brand-500" />
                          )}
                        </div>
                      </div>
                      {/* Suggestion Text */}
                      <p className="text-sm text-slate-200 leading-relaxed text-left font-normal select-text">
                        "{text}"
                      </p>
                    </div>
                  </SpotlightCard>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No review suggestions found. Feel free to write your own below.
                </div>
              )}
            </div>

            {/* Edit Review Section */}
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Customize Review</span>
                </span>
                {!isEditing && (
                  <span className="text-[10px] text-slate-500 italic">Click inside textarea to edit</span>
                )}
              </div>
              <textarea
                value={editableText}
                onChange={(e) => {
                  setEditableText(e.target.value);
                  setIsEditing(true);
                }}
                className="w-full min-h-[100px] glass-input rounded-2xl p-4 text-sm text-slate-200 leading-relaxed font-sans focus:ring-1 focus:ring-brand-500 resize-none"
                placeholder="Modify your review here..."
              />
            </div>

            {/* NLP Auto-Routing Indicator (Visualizes sentiment architecture) */}
            {predictedSentiment && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <CornerDownRight className="w-3.5 h-3.5 text-brand-400" />
                  <span>AI Sentiment Prediction:</span>
                  <span className={`font-semibold font-display ${
                    predictedSentiment.requiresPrivateFeedback ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {predictedSentiment.sentiment} ({Math.round(predictedSentiment.score * 100)}%)
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Auto-routes to {predictedSentiment.requiresPrivateFeedback ? 'Feedback Form' : 'Google Reviews'}
                </div>
              </div>
            )}

            {/* Primary Submit Button */}
            <motion.button
              onClick={handleSubmit}
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(118, 32, 191, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-2xl py-4 px-6 font-display font-bold text-sm tracking-wide shadow-lg border border-brand-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
            >
              <span>Submit Review</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {/* Demo Routing Controls (Requirements Page 2) */}
            <div className="border-t border-white/5 pt-4 mt-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-display block text-center mb-3">
                Demo Walkthrough Routing Controls
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={forcePositiveFlow}
                  className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 rounded-xl py-2 px-3 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
                >
                  Positive Experience →
                  <span className="text-[10px] text-slate-400">Google Success</span>
                </button>
                <button
                  onClick={forceNegativeFlow}
                  className="flex items-center justify-center gap-1 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 rounded-xl py-2 px-3 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
                >
                  Negative Experience →
                  <span className="text-[10px] text-slate-400">Feedback Form</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </motion.div>
    </div>
  );
}

// Sub-component supporting Spotlight Cursor Effect and Lift animations
function SpotlightCard({ children, isSelected, onClick }) {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <motion.button
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`spotlight-container text-left w-full rounded-2xl p-4 transition-all duration-300 border focus:outline-none cursor-pointer ${
        isSelected
          ? 'bg-white/[0.04] border-brand-500 glow-purple shadow-lg shadow-brand-500/5'
          : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5 shadow-md hover:shadow-lg hover:shadow-black/20'
      }`}
    >
      {/* Spotlight Cursor Gradient layer */}
      <div 
        className="spotlight-glow" 
        style={{ 
          left: `${coords.x}px`, 
          top: `${coords.y}px` 
        }} 
      />
      {children}
    </motion.button>
  );
}

// ─── Emergency in-memory fallback — guarantees non-blank suggestions ──────────────────
// Called synchronously when both Gemini and the local mock both fail.
function _emergencyFallback(ratings = {}) {
  const avg = ((ratings.food || 5) + (ratings.service || 5) + (ratings.ambience || 5)) / 3;
  if (avg >= 4) {
    return [
      'Had a fantastic experience here. The food was delicious, service was attentive, and the ambience was wonderful. Highly recommend this place!',
      'Absolutely loved dining here. Everything from the food to the service was top-notch. Will definitely be coming back!',
      'Wonderful restaurant with great food and friendly staff. The atmosphere was cozy and comfortable. Five stars!',
    ];
  }
  return [
    'Decent dining experience overall. The food was satisfying and the service was acceptable. A good spot for a casual meal.',
    'Had an okay visit. The food was fine and service was standard. The ambience was comfortable enough for a relaxed meal.',
    'Average experience but nothing exceptional. Food was satisfying, service was polite. Might give it another try.',
  ];
}
