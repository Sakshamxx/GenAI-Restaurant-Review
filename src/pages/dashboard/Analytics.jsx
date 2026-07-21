import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, Sparkles, Loader2, TrendingUp, RefreshCw } from 'lucide-react'
import { getRestaurantStats, getReviews, getFeedback } from '../../services/supabase_db.js'
import { Toast, apiCall } from '../../lib/errorHandler.js'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend
} from 'recharts'

export default function Analytics() {
  const { restaurant } = useOutletContext() || {};
  const restaurantId = restaurant?.id;

  const [stats, setStats] = useState({ redirects: 0, totalFeedback: 0, totalReviews: 0, avgRating: 0 });
  const [reviews, setReviews] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    
    await apiCall(
      async () => {
        setLoading(true);
        setError('');
        
        try {
          const [s, r, f] = await Promise.all([
            getRestaurantStats(restaurantId),
            getReviews(restaurantId),
            getFeedback(restaurantId),
          ]);
          
          setStats(s);
          setReviews(r);
          setFeedback(f);
          Toast.success('Analytics updated')
        } catch (err) {
          console.error('[Analytics] load error:', err);
          setError('Failed to load analytics data. ' + (err.message || ''))
          Toast.error('Failed to load analytics')
        } finally {
          setLoading(false);
        }
      },
      { retries: 1 }
    )
  }

  useEffect(() => {
    loadAnalytics();
  }, [restaurantId]);

  const NO_FEEDBACK_MESSAGE = 'No customer feedback has been received yet.'

  // ── Chart 1: Sentiment Distribution (from ML-labelled reviews) ──────────────
  const sentimentData = (() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    reviews.forEach(r => {
      const s = (r.sentiment || r.sentiment_prediction || r.sentiment_label || '').toLowerCase();
      if (s === 'positive') counts.Positive++;
      else if (s === 'neutral') counts.Neutral++;
      else if (s === 'negative') counts.Negative++;
      else counts.Positive++; // default: assume positive redirect
    });
    return [
      { name: 'Positive', value: counts.Positive, color: '#22c55e' },
      { name: 'Neutral',  value: counts.Neutral,  color: '#a78bfa' },
      { name: 'Negative', value: counts.Negative, color: '#f43f5e' },
    ].filter(d => d.value > 0);
  })();

  // ── Chart 3: Complaint category frequency ─────────────────────────────────
  const categoryData = (() => {
    const counts = {};
    const colors = ['#f43f5e', '#fb923c', '#fbbf24', '#2dd4bf', '#a78bfa', '#38bdf8', '#34d399'];
    feedback.forEach(f => {
      const cat = f.category || 'Private Feedback';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, Count], i) => ({ name, Count, color: colors[i % colors.length] }));
  })();

  const feedbackCount = feedback.length;

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#0f172a',
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      color: '#f8fafc',
    }
  };

  const noData = !loading && stats.totalReviews === 0 && stats.totalFeedback === 0;

  const positiveCount = sentimentData.find(d => d.name === 'Positive')?.value || 0;
  const negativeCount = sentimentData.find(d => d.name === 'Negative')?.value || 0;

  // ── Header with refresh button ──────────────────────────────────────────────
  const headerSection = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Business Intelligence</h1>
        <p className="text-sm text-slate-400 mt-1">Deep analysis of customer sentiment and operational metrics.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      {headerSection}

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {noData && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/5 flex flex-col items-center gap-3">
          <BarChart3 className="w-10 h-10 text-slate-600" />
          <span className="text-sm font-semibold text-slate-400 font-display">{NO_FEEDBACK_MESSAGE}</span>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Please encourage customers to scan the QR code and submit a review or feedback.
          </p>
        </div>
      )}

      {!loading && !noData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 border border-white/5"
            >
              <span className="text-xs uppercase tracking-[0.26em] text-slate-400">Total Reviews</span>
              <p className="mt-4 text-4xl font-extrabold text-white">{stats.totalReviews}</p>
              <p className="text-xs text-slate-500 mt-2">All submitted customer reviews.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 border border-white/5"
            >
              <span className="text-xs uppercase tracking-[0.26em] text-slate-400">Average Rating</span>
              <p className="mt-4 text-4xl font-extrabold text-white">{stats.avgRating?.toFixed(1) ?? '0.0'}★</p>
              <p className="text-xs text-slate-500 mt-2">Customer review rating average.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 border border-white/5"
            >
              <span className="text-xs uppercase tracking-[0.26em] text-slate-400">Positive Reviews</span>
              <p className="mt-4 text-4xl font-extrabold text-white">{positiveCount}</p>
              <p className="text-xs text-slate-500 mt-2">Positive customer sentiment.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 border border-white/5"
            >
              <span className="text-xs uppercase tracking-[0.26em] text-slate-400">Negative Reviews</span>
              <p className="mt-4 text-4xl font-extrabold text-white">{negativeCount}</p>
              <p className="text-xs text-slate-500 mt-2">Negative customer sentiment.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl p-5 border border-white/5"
            >
              <span className="text-xs uppercase tracking-[0.26em] text-slate-400">Feedback Items</span>
              <p className="mt-4 text-4xl font-extrabold text-white">{stats.totalFeedback}</p>
              <p className="text-xs text-slate-500 mt-2">Private complaint submissions.</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6">

            {/* Chart 1: Sentiment Distribution Pie */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col"
          >
            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>Sentiment Distribution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ML-classified sentiment across {reviews.length} submitted reviews.</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={85}
                      paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sentimentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-500 italic text-xs">{NO_FEEDBACK_MESSAGE}</span>
              )}
            </div>
          </motion.div>


          {/* Chart 3: Complaint Category Frequency */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                <span>Complaint Categories</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ML-classified complaint types from {feedback.length} private feedback submissions.</p>
            </div>
            <div className="h-64 text-xs">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ left: -25, right: 10, top: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-slate-500 italic text-xs">{NO_FEEDBACK_MESSAGE}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col"
          >
            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <span>Feedback Volume</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Private feedback submissions captured in the dashboard.</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-semibold text-white">{feedbackCount}</div>
                <div className="mt-2 text-sm text-slate-400">feedback entries</div>
              </div>
            </div>
          </motion.div>

        </div>
        </>
      )}
    </div>
  );
}
