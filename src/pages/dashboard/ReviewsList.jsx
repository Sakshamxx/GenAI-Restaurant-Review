import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { MessageSquare, Star, Search, Filter, AlertCircle, Loader2 } from 'lucide-react'
import { getReviews } from '../../services/supabase_db.js'

export default function ReviewsList() {
  const { restaurant } = useOutletContext() || {};
  const restaurantId = restaurant?.id;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStars, setFilterStars] = useState('all');

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await getReviews(restaurantId);
        console.log('[ReviewsList] reviews:', data);
        setReviews(data);
      } catch (err) {
        console.error('[ReviewsList] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId]);

  const filteredReviews = reviews.filter(rev => {
    const text = (rev.review_text || '').toLowerCase();
    const name = (rev.customer_name || '').toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase());

    const avgStars = rev.overall_rating || 0;
    const matchesStars =
      filterStars === 'all' ||
      (filterStars === '5' && avgStars >= 4.5) ||
      (filterStars === '4' && avgStars >= 3.5 && avgStars < 4.5) ||
      (filterStars === '3' && avgStars < 3.5);

    return matchesSearch && matchesStars;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Google Review Activity</h1>
        <p className="text-sm text-slate-400 mt-1">Customer drafts that successfully generated Google Review redirects.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/5 rounded-3xl p-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by keywords or customer name..."
            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all select-text"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStars}
              onChange={(e) => setFilterStars(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 py-2.5 px-3 focus:outline-none focus:border-brand-500 transition-colors w-full md:w-auto"
            >
              <option value="all">All Stars</option>
              <option value="5">Excellent (4.5+★)</option>
              <option value="4">Good (3.5–4.5★)</option>
              <option value="3">Below Average (&lt;3.5★)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      )}

      {/* Feed */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((rev) => {
              const food = rev.food_rating || 0;
              const service = rev.service_rating || 0;
              const ambience = rev.ambience_rating || 0;
              const avg = rev.overall_rating ?? ((food + service + ambience) / 3);

              return (
                <motion.div
                  key={rev.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col gap-4 text-left"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-display font-bold text-white">
                          {rev.customer_name || 'Anonymous Customer'}
                        </h3>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {(rev.redirected_to_google || rev.google_redirected) && ' • Redirected to Google'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex gap-0.5 text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full text-xs font-bold font-display">
                        <Star className="w-3.5 h-3.5 fill-brand-400 mt-0.5" />
                        <span>{avg.toFixed(1)} / 5.0</span>
                      </div>
                      <span className={`text-[9px] font-bold font-display uppercase tracking-wider rounded px-1.5 py-0.2
                        ${rev.sentiment === 'POSITIVE'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                        {rev.sentiment || 'POSITIVE'}
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-slate-300 leading-relaxed italic font-normal select-text bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                    "{rev.review_text}"
                  </p>

                  {/* Aspect Scores */}
                  {(food || service || ambience) > 0 && (
                    <div className="flex gap-3 text-[10px] text-slate-500 font-semibold font-display pt-2 border-t border-white/5">
                      <span>Food: <strong className="text-white">{food}★</strong></span>
                      <span>Service: <strong className="text-white">{service}★</strong></span>
                      <span>Ambience: <strong className="text-white">{ambience}★</strong></span>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="glass-panel rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 border border-white/5 py-16">
              <AlertCircle className="w-10 h-10 text-slate-600" />
              <span className="text-sm font-semibold text-slate-400 font-display">
                {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}
              </span>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {reviews.length === 0
                  ? 'Reviews submitted through your QR codes will appear here.'
                  : 'Try resetting your search or switching the star filter.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
