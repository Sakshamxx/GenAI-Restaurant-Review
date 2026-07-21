import React, { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  QrCode,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Star
} from 'lucide-react'
import { getRestaurantStats, getReviews, getFeedback, getActivityLogs } from '../../services/supabase_db.js'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function Overview() {
  const { restaurant } = useOutletContext() || {};
  const restaurantId = restaurant?.id;

  const [stats, setStats] = useState({
    totalReviews: 0, totalFeedback: 0, avgRating: 0,
    totalScans: 0, redirects: 0, redirectRate: 0
  });
  const [recentReviews, setRecentReviews] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [s, reviews, feedback, logs] = await Promise.all([
          getRestaurantStats(restaurantId),
          getReviews(restaurantId),
          getFeedback(restaurantId),
          getActivityLogs(restaurantId, 500),
        ]);
        console.log('[Overview] stats:', s);
        console.log('[Overview] reviews:', reviews);
        console.log('[Overview] feedback:', feedback);
        console.log('[Overview] activity logs:', logs?.length);
        setStats(s);
        setRecentReviews(reviews.slice(0, 3));
        setRecentFeedback(feedback.slice(0, 3));
        setActivityLogs(logs || []);
      } catch (err) {
        console.error('[Overview] load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [restaurantId]);

  // Build real chart data from activity_logs for the past 7 days
  const chartData = React.useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    // Create an ordered array for the last 7 days (oldest → newest)
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return { name: days[d.getDay()], date: d.toDateString(), Scans: 0, Reviews: 0 };
    });
    activityLogs.forEach(log => {
      const logDate = new Date(log.created_at);
      const match = result.find(r => r.date === logDate.toDateString());
      if (!match) return;
      if (log.activity_type === 'qr_scanned') match.Scans += 1;
      if (log.activity_type === 'review_submitted') match.Reviews += 1;
    });
    return result;
  }, [activityLogs]);

  const cards = [
    {
      title: 'QR Scans',
      value: stats.totalScans,
      description: 'Total code impressions',
      change: `${stats.redirectRate}% redirect rate`,
      icon: QrCode,
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10 border-brand-500/20'
    },
    {
      title: 'Customer Reviews',
      value: stats.totalReviews,
      description: 'Actual reviews submitted via your QR flow',
      change: `avg ${stats.avgRating}★`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Google Redirects',
      value: stats.redirects,
      description: 'Redirected to Google Maps',
      change: `${stats.redirectRate}% conversion`,
      icon: MessageSquare,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/20'
    },
    {
      title: 'Feedback Collected',
      value: stats.totalFeedback,
      description: 'Complaints captured privately',
      change: 'private channel',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20'
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          {restaurant
            ? `Live statistics for ${restaurant.name}`
            : 'Real-time statistics for your QR channels & feedback system.'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between min-h-[140px] border border-white/5"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
                  {card.title}
                </span>
                <span className={`text-3xl font-extrabold text-white tracking-tight mt-2 ${loading ? 'opacity-40' : ''}`}>
                  {loading ? '—' : card.value}
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <span className="text-xs text-slate-500 truncate">{card.description}</span>
              <span className={`text-[11px] font-semibold font-display ${card.color}`}>
                {card.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + Quick Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 glass-panel rounded-3xl p-5 md:p-6 border border-white/5"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-display font-bold text-white">Activity Overview</h2>
              <p className="text-xs text-slate-400">Weekly traffic of QR scans and reviews</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-slate-300">Scans</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-300">Reviews</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7620BF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7620BF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }} />
                <Area type="monotone" dataKey="Scans" stroke="#7620BF" strokeWidth={2} fillOpacity={1} fill="url(#colorScans)" />
                <Area type="monotone" dataKey="Reviews" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorReviews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Activity Feed */}
        <div className="flex flex-col gap-6">
          {/* Recent Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="glass-panel rounded-3xl p-5 border border-white/5 flex flex-col gap-3 min-h-[220px]"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-display font-bold text-white">Recent Reviews</h3>
              </div>
              <Link to="/dashboard/reviews" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px]">
              {recentReviews.length > 0 ? recentReviews.map((rev) => (
                <div key={rev.id} className="text-xs flex flex-col gap-1 border-b border-white/[0.02] pb-2 last:border-b-0">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-200">{rev.customer_name || 'Anonymous'}</span>
                    <div className="flex items-center gap-0.5 text-brand-400">
                      <Star className="w-3 h-3 fill-brand-400" />
                      <span>{rev.overall_rating ?? '—'}★</span>
                    </div>
                  </div>
                  <p className="text-slate-400 truncate italic">"{rev.review_text}"</p>
                </div>
              )) : (
                <span className="text-slate-500 italic text-center text-xs py-4">No reviews recorded yet.</span>
              )}
            </div>
          </motion.div>

          {/* Recent Complaints */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-panel rounded-3xl p-5 border border-white/5 flex flex-col gap-3 min-h-[220px]"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-display font-bold text-white">Recent Complaints</h3>
              </div>
              <Link to="/dashboard/feedback" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px]">
              {recentFeedback.length > 0 ? recentFeedback.map((feed) => (
                <div key={feed.id} className="text-xs flex flex-col gap-1 border-b border-white/[0.02] pb-2 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded px-1.5 py-0.2 text-[9px] font-semibold">
                      {feed.category || 'Private Feedback'}
                    </span>
                    <span className="text-[10px] text-slate-500">{feed.severity || 'Open'}</span>
                  </div>
                  <p className="text-slate-300 truncate font-medium">"{feed.feedback_text}"</p>
                </div>
              )) : (
                <span className="text-slate-500 italic text-center text-xs py-4">No complaints collected yet.</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
