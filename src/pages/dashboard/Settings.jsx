import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { Save, Check, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { getMyRestaurant, upsertRestaurant } from '../../services/supabase_db.js'

export default function SettingsPage() {
  const { session } = useOutletContext() || {};

  const [formData, setFormData] = useState({
    restaurant_name: '',
    google_review_link: '',
    owner_email: '',
    owner_name: '',
    phone: '',
    address: '',
    min_review_threshold: 4.0,
    ai_writing_style: 'Enthusiastic & Warm',
    notifications_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load restaurant row from Supabase
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const restaurant = await getMyRestaurant();
        console.log('[Settings] restaurant:', restaurant);
        
        // Load custom local config overrides
        const localConfig = JSON.parse(localStorage.getItem('reviewflow_local_config') || '{}');

        if (restaurant) {
          const threshold = localConfig.min_review_threshold ?? restaurant.min_review_threshold ?? 4.0;
          const writingStyle = localConfig.ai_writing_style ?? restaurant.ai_writing_style ?? 'Enthusiastic & Warm';
          const notify = localConfig.notifications_enabled ?? restaurant.notifications_enabled ?? true;

          // Sync to sessionStorage for customer facing screens to read immediately
          sessionStorage.setItem('reviewflow_min_review_threshold', threshold.toString());

          setFormData({
            restaurant_name:      restaurant.restaurant_name || '',
            google_review_link:   restaurant.google_review_link || '',
            owner_email:          restaurant.owner_email || session?.user?.email || '',
            owner_name:           restaurant.owner_name || '',
            phone:                restaurant.phone || '',
            address:              restaurant.address || '',
            min_review_threshold: threshold,
            ai_writing_style:     writingStyle,
            notifications_enabled: notify,
          });
        } else {
          setFormData(prev => ({
            ...prev,
            owner_email: session?.user?.email || '',
          }));
        }
      } catch (err) {
        console.error('[Settings] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // 1. Save standard columns to Supabase
      await upsertRestaurant({
        restaurant_name:    formData.restaurant_name,
        google_review_link: formData.google_review_link,
        owner_email:        formData.owner_email,
        owner_name:         formData.owner_name,
        phone:              formData.phone,
        address:            formData.address,
      });

      // 2. Save settings missing from database columns to localStorage as local overrides
      const localOverrides = {
        min_review_threshold:  formData.min_review_threshold,
        ai_writing_style:      formData.ai_writing_style,
        notifications_enabled: formData.notifications_enabled,
      };
      localStorage.setItem('reviewflow_local_config', JSON.stringify(localOverrides));
      sessionStorage.setItem('reviewflow_min_review_threshold', formData.min_review_threshold.toString());

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Configuration</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your brand names, redirection targets, and email notification alerts.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Restaurant Branding */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col gap-5"
        >
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-display border-b border-white/5 pb-2">
            Restaurant Details
          </h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Restaurant Name</label>
            <input
              type="text"
              value={formData.restaurant_name}
              onChange={(e) => set('restaurant_name', e.target.value)}
              required
              placeholder="The Violet Orchid"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
            />
            <p className="text-[10px] text-slate-500">This updates the welcome title header on your customers' review screens.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Owner / Manager Name</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => set('owner_name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="123 Main Street, New Delhi"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
            />
          </div>
        </motion.div>

        {/* Routing & AI Prompts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col gap-5"
        >
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-display border-b border-white/5 pb-2">
            Routing & AI Prompts
          </h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Google Maps Review Link</label>
            <input
              type="url"
              value={formData.google_review_link}
              onChange={(e) => set('google_review_link', e.target.value)}
              required
              placeholder="https://search.google.com/local/writereview?placeid=..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
            />
            <p className="text-[10px] text-slate-500">
              Destination URL for positive redirects. Paste your Google Places review link.
              This value is stored as <code className="text-brand-400">google_review_link</code> in the database.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Minimum Stars for Redirect</label>
              <select
                value={formData.min_review_threshold}
                onChange={(e) => set('min_review_threshold', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value={4.5}>4.5 Stars (Strict Positive)</option>
                <option value={4.0}>4.0 Stars (Standard Recommended)</option>
                <option value={3.5}>3.5 Stars (Lenient)</option>
                <option value={3.0}>3.0 Stars (Permissive)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">AI Generation Tone</label>
              <select
                value={formData.ai_writing_style}
                onChange={(e) => set('ai_writing_style', e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="Enthusiastic & Warm">Enthusiastic & Warm</option>
                <option value="Minimalist & Direct">Minimalist & Direct</option>
                <option value="Sophisticated & Formal">Sophisticated & Elegant</option>
                <option value="Casual & Friendly">Casual & Friendly</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Alerts & Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col gap-5"
        >
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-display border-b border-white/5 pb-2">
            Alerts & Complaints
          </h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Notification Email</label>
            <input
              type="email"
              value={formData.owner_email}
              onChange={(e) => set('owner_email', e.target.value)}
              required
              placeholder="manager@violetorchid.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-all select-text"
            />
            <p className="text-[10px] text-slate-500">Destination address for immediate complaint alerts.</p>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white font-display">Instant Email Alerts</span>
              <span className="text-[10px] text-slate-500">Send an email immediately when a negative report is submitted.</span>
            </div>
            <button
              type="button"
              onClick={() => set('notifications_enabled', !formData.notifications_enabled)}
              className="focus:outline-none text-brand-500 hover:text-brand-400 transition-colors"
            >
              {formData.notifications_enabled
                ? <ToggleRight className="w-12 h-12" />
                : <ToggleLeft className="w-12 h-12 text-slate-600" />
              }
            </button>
          </div>
        </motion.div>

        {/* Submit */}
        <div className="flex items-center gap-4 justify-end mt-4">
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Settings Saved!</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-2.5 px-6 font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg border border-brand-400/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
}

