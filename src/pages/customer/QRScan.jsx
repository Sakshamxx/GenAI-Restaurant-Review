import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Utensils, HeartHandshake, Home, Check, Sparkles, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

const FOOD_TAGS = {
  positive: ['Delicious', 'Fresh', 'Authentic', 'Value for Money', 'Flavorful'],
  neutral: ['Average', 'Filling', 'Standard'],
  negative: ['Bland', 'Overpriced']
};

const SERVICE_TAGS = {
  positive: ['Friendly', 'Professional', 'Fast', 'Helpful', 'Attentive'],
  neutral: ['Acceptable', 'Standard', 'Average'],
  negative: ['Slow', 'Unresponsive']
};

const AMBIENCE_TAGS = {
  positive: ['Clean', 'Comfortable', 'Cozy', 'Premium', 'Relaxing'],
  neutral: ['Casual', 'Simple', 'Average'],
  negative: ['Noisy', 'Crowded']
};

const TAG_MAX = 3; // Maximum tags per category (Task 4)

function isLikelyUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

export default function QRScan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantId: routeRestaurantId, tableId: routeTableId } = useParams();
  const queryParams = new URLSearchParams(location.search);
  const restaurantId = routeRestaurantId || queryParams.get('restaurantId') || sessionStorage.getItem('reviewflow_restaurant_id');
  const tableId = routeTableId || queryParams.get('tableId') || sessionStorage.getItem('reviewflow_table_id');
  const [restaurantName, setRestaurantName] = useState('Welcome');
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch restaurant from Supabase and store config in sessionStorage
  useEffect(() => {
    if (restaurantId) {
      console.log('[QRScan] Found restaurantId:', restaurantId);
      sessionStorage.setItem('reviewflow_restaurant_id', restaurantId);
    }
    if (tableId) {
      console.log('[QRScan] Found tableId:', tableId);
      sessionStorage.setItem('reviewflow_table_id', tableId);
    }

    // Load restaurant details for display + google URL, then increment scan count
    const loadRestaurant = async () => {
      if (!restaurantId) {
        setStatusMessage('This QR link is missing a restaurant identifier.');
        console.warn('[QRScan] No restaurantId provided, skipping DB fetch.');
        return;
      }

      if (!isLikelyUuid(restaurantId)) {
        setStatusMessage('This QR link is invalid. Please contact the restaurant.');
        console.warn('[QRScan] Invalid restaurant id format:', restaurantId);
        return;
      }

      try {
        console.log('[QRScan] Fetching restaurant info from Supabase for ID:', restaurantId);
        const { data, error } = await supabase
          .from('restaurants')
          .select('restaurant_name, google_review_link')
          .eq('id', restaurantId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          console.log('[QRScan] Successfully fetched restaurant data:', data);
          setRestaurantName(data.restaurant_name || 'Restaurant');
          sessionStorage.setItem('reviewflow_restaurant_name', data.restaurant_name || '');
          if (data.google_review_link) {
            sessionStorage.setItem('reviewflow_google_url', data.google_review_link);
          } else {
            setStatusMessage('This restaurant has not configured a Google review link yet.');
          }

          const localConfig = JSON.parse(localStorage.getItem('reviewflow_local_config') || '{}');
          const threshold = localConfig.min_review_threshold ?? 4.0;
          sessionStorage.setItem('reviewflow_min_review_threshold', threshold.toString());

          if (BACKEND_URL) {
            fetch(`${BACKEND_URL}/api/qr/scan/${restaurantId}`, { method: 'POST' })
              .then(r => r.json())
              .catch(e => console.warn('[QRScan] Could not increment scan count:', e.message));
          }
        } else {
          setStatusMessage('This QR code could not be matched to a restaurant.');
          console.error('[QRScan] Restaurant not found in DB for ID:', restaurantId);
        }
      } catch (err) {
        setStatusMessage('Unable to load this review experience right now.');
        console.error('[QRScan] Failed to load restaurant data:', err);
      }
    };

    loadRestaurant();
  }, [restaurantId, tableId]);

  // Ratings State
  const [ratings, setRatings] = useState({
    food: 5,
    service: 5,
    ambience: 5
  });

  // Selected Tags State
  const [selectedTags, setSelectedTags] = useState({
    food: [],
    service: [],
    ambience: []
  });

  // Active Tab for Tags
  const [activeTab, setActiveTab] = useState('food');

  const handleStarClick = (category, ratingValue) => {
    setRatings(prev => ({
      ...prev,
      [category]: ratingValue
    }));
  };

  const toggleTag = (category, tag) => {
    setSelectedTags(prev => {
      const currentTags = prev[category];
      const isSelected = currentTags.includes(tag);

      // If already selected, allow deselect
      if (isSelected) {
        return { ...prev, [category]: currentTags.filter(t => t !== tag) };
      }

      // Enforce max 3 tags per category
      if (currentTags.length >= TAG_MAX) {
        return prev; // Do not add more
      }

      return { ...prev, [category]: [...currentTags, tag] };
    });
  };

  const getTagsForCategory = (category) => {
    if (category === 'food') return FOOD_TAGS;
    if (category === 'service') return SERVICE_TAGS;
    return AMBIENCE_TAGS;
  };

  const handleGenerate = () => {
    // Save selections in sessionStorage for Page 2 to pick up
    sessionStorage.setItem('reviewflow_ratings', JSON.stringify(ratings));
    sessionStorage.setItem('reviewflow_selected_tags', JSON.stringify(selectedTags));
    
    // Navigate to Page 2: AISuggestions
    navigate('/suggestions');
  };

  const categories = [
    { id: 'food', label: 'Food', icon: Utensils, color: 'text-amber-400' },
    { id: 'service', label: 'Service', icon: HeartHandshake, color: 'text-sky-400' },
    { id: 'ambience', label: 'Ambience', icon: Home, color: 'text-emerald-400' }
  ];

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:py-16 select-none">
      {/* Mobile-first card container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden"
      >
        {/* Subtle decorative purple glow background inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Restaurant Header */}
        <div className="text-center">
          <p className="text-xs text-brand-300 tracking-widest font-semibold uppercase font-display mb-1">Welcome to</p>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight">
          {restaurantName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rate Your Experience
            {tableId && <span className="ml-2 text-brand-400 font-semibold">· {tableId}</span>}
          </p>
          {statusMessage && (
            <p className="mt-2 text-xs text-amber-300">{statusMessage}</p>
          )}
        </div>

        {/* Section 1: Star Ratings */}
        <div className="flex flex-col gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-display mb-1">
            Ratings
          </h2>
          
          {categories.map(({ id, label, icon: Icon, color }) => (
            <div key={id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-sm font-medium text-slate-200">{label}</span>
              </div>
              
              {/* Star Rating Render */}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= ratings[id];
                  return (
                    <motion.button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(id, star)}
                      whileTap={{ scale: 0.8 }}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors duration-200 ${
                          isFilled 
                            ? 'fill-brand-500 text-brand-500 drop-shadow-[0_0_8px_rgba(118,32,191,0.5)]' 
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Section 2: Tags Category Navigation Tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between border-b border-white/5 pb-1 relative">
            {categories.map((cat) => {
              const isActive = activeTab === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-semibold font-display tracking-wider uppercase relative transition-colors ${
                    isActive ? 'text-brand-300' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-500"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tag Cloud with Liquid/Checkmark Buttons */}
          <div className="min-h-[140px] flex flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3"
              >
                {/* Tag limit indicator */}
                {selectedTags[activeTab].length >= TAG_MAX && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold font-display">
                    <Lock className="w-3 h-3" />
                    <span>Max {TAG_MAX} tags selected — deselect one to change</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                  {/* Positive Tags */}
                  {getTagsForCategory(activeTab).positive.map(tag => (
                    <TagButton
                      key={tag}
                      tag={tag}
                      isSelected={selectedTags[activeTab].includes(tag)}
                      isDisabled={!selectedTags[activeTab].includes(tag) && selectedTags[activeTab].length >= TAG_MAX}
                      type="positive"
                      onClick={() => toggleTag(activeTab, tag)}
                    />
                  ))}

                  {/* Neutral Tags */}
                  {getTagsForCategory(activeTab).neutral.map(tag => (
                    <TagButton
                      key={tag}
                      tag={tag}
                      isSelected={selectedTags[activeTab].includes(tag)}
                      isDisabled={!selectedTags[activeTab].includes(tag) && selectedTags[activeTab].length >= TAG_MAX}
                      type="neutral"
                      onClick={() => toggleTag(activeTab, tag)}
                    />
                  ))}

                  {/* Negative Tags */}
                  {getTagsForCategory(activeTab).negative.map(tag => (
                    <TagButton
                      key={tag}
                      tag={tag}
                      isSelected={selectedTags[activeTab].includes(tag)}
                      isDisabled={!selectedTags[activeTab].includes(tag) && selectedTags[activeTab].length >= TAG_MAX}
                      type="negative"
                      onClick={() => toggleTag(activeTab, tag)}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Generate Button CTA */}
        <motion.button
          onClick={handleGenerate}
          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(118, 32, 191, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-2xl py-4 px-6 font-display font-bold text-sm tracking-wide shadow-lg border border-brand-400/20 flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
        >
          <Sparkles className="w-4 h-4 text-brand-200" />
          <span>Generate Review Suggestions ✨</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// Reusable Tag Button Component implementing custom Framer Motion transitions and Liquid/Outline looks
function TagButton({ tag, isSelected, isDisabled, type, onClick }) {
  // Border and glow colors based on tag state and type
  const getColors = () => {
    if (isDisabled) {
      // Muted style for tags that can't be selected (limit reached)
      return 'border-white/5 text-slate-600 bg-transparent cursor-not-allowed opacity-40';
    }
    if (!isSelected) {
      return 'border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 bg-transparent';
    }
    // Selected styles: Purple theme glow and background
    return 'bg-brand-500 text-white border-brand-400/30 glow-purple';
  };

  return (
    <motion.button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      whileHover={isDisabled ? {} : { scale: 1.05 }}
      whileTap={isDisabled ? {} : { scale: 0.95 }}
      className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all duration-200 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${getColors()}`}
    >
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            <Check className="w-3 h-3 stroke-[3px]" />
          </motion.span>
        )}
      </AnimatePresence>
      <span>{tag}</span>
    </motion.button>
  );
}
