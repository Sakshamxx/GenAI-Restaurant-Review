import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, Sparkles, Star, Loader2, TrendingUp } from 'lucide-react'
import { getRestaurantStats, getReviews, getFeedback } from '../../services/supabase_db.js'
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

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [s, r, f] = await Promise.all([
          getRestaurantStats(restaurantId),
          getReviews(restaurantId),
          getFeedback(restaurantId),
        ]);
        console.log('[Analytics] stats:', s);
        console.log('[Analytics] reviews:', r);
        console.log('[Analytics] feedback:', f);
        setStats(s);
        setReviews(r);
        setFeedback(f);
      } catch (err) {
        console.error('[Analytics] load error:', err);
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId]);

  // ── Chart 1: Sentiment Distribution (from ML-labelled reviews) ──────────────
  const sentimentData = (() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    reviews.forEach(r => {
      const s = (r.sentiment || '').toLowerCase();
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

  // ── Chart 2: Aspect avg ratings ──────────────────────────────────────────
  const aspectRatings = (() => {
    if (reviews.length === 0) return [];
    const sum = { food: 0, service: 0, ambience: 0 };
    let count = 0;
    reviews.forEach(r => {
      if (r.food_rating || r.service_rating || r.ambience_rating) {
        sum.food    += r.food_rating    || 0;
        sum.service += r.service_rating || 0;
        sum.ambience += r.ambience_rating || 0;
        count++;
      }
    });
    if (count === 0) return [];
    return [
      { name: 'Food Quality', Rating: parseFloat((sum.food    / count).toFixed(1)) },
      { name: 'Service',      Rating: parseFloat((sum.service / count).toFixed(1)) },
      { name: 'Ambience',     Rating: parseFloat((sum.ambience / count).toFixed(1)) },
    ];
  })();

  // ── Chart 3: Complaint category frequency ─────────────────────────────────
  const categoryData = (() => {
    const counts = {};
    const colors = ['#f43f5e', '#fb923c', '#fbbf24', '#2dd4bf', '#a78bfa', '#38bdf8', '#34d399'];
    feedback.forEach(f => {
      const cat = f.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, Count], i) => ({ name, Count, color: colors[i % colors.length] }));
  })();

  // ── Chart 4: Severity breakdown ────────────────────────────────────────────
  const severityData = (() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    feedback.forEach(f => {
      const sev = f.severity;
      if (sev in counts) counts[sev]++;
    });
    const colors = { Low: '#34d399', Medium: '#fbbf24', High: '#fb923c', Critical: '#f43f5e' };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: colors[name] }));
  })();

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#0f172a',
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      color: '#f8fafc',
    }
  };

  const noData = !loading && reviews.length === 0 && feedback.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Business Intelligence</h1>
        <p className="text-sm text-slate-400 mt-1">Deep analysis of customer sentiment distribution and operational bottlenecks.</p>
      </div>

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
          <span className="text-sm font-semibold text-slate-400 font-display">No analytics data yet</span>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Analytics will populate once customers start scanning your QR codes and submitting reviews.
          </p>
        </div>
      )}

      {!loading && !noData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
                <span className="text-slate-500 italic text-xs">No ML sentiment data yet — submit reviews first.</span>
              )}
            </div>
          </motion.div>

          {/* Chart 2: Aspect Ratings */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-brand-400" />
                <span>Aspect Ratings (Out of 5.0)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Average customer scores grouped by restaurant category.</p>
            </div>
            <div className="h-64 text-xs">
              {aspectRatings.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aspectRatings} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} width={80} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="Rating" radius={[0, 6, 6, 0]}>
                      {aspectRatings.map((entry, i) => (
                        <Cell key={i} fill={entry.Rating >= 4.3 ? '#7620BF' : '#a78bfa'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-slate-500 italic text-xs">No aspect rating data yet.</span>
                </div>
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
                  <span className="text-slate-500 italic text-xs">No complaint data yet.</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Chart 4: Severity Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col"
          >
            <div className="mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <span>Severity Breakdown</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ML-predicted severity levels across all private feedback.</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={80}
                      paddingAngle={4} dataKey="value"
                    >
                      {severityData.map((entry, i) => (
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
                <span className="text-slate-500 italic text-xs">No severity data yet.</span>
              )}
            </div>
            {/* Severity legend pills */}
            {severityData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-white/5">
                {severityData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs font-semibold">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-300">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      )}
    </div>
  );
}
