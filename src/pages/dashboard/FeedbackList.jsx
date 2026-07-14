import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { AlertTriangle, CheckSquare, Square, Search, Star, Loader2 } from 'lucide-react'
import { getFeedback, toggleFeedbackResolved } from '../../services/supabase_db.js'

export default function FeedbackList() {
  const { restaurant } = useOutletContext() || {};
  const restaurantId = restaurant?.id;

  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await getFeedback(restaurantId);
        console.log('[FeedbackList] feedback:', data);
        setFeedbackList(data);
      } catch (err) {
        console.error('[FeedbackList] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId]);

  const handleToggleResolve = async (feed) => {
    const updated = await toggleFeedbackResolved(feed.id, feed.resolved);
    if (updated) {
      setFeedbackList(prev => prev.map(f => f.id === updated.id ? updated : f));
    }
  };

  const filteredFeedback = feedbackList.filter(feed => {
    const text = (feed.feedback_text || '').toLowerCase();
    const cat = (feed.category || '').toLowerCase();
    const matchesSearch =
      text.includes(searchTerm.toLowerCase()) ||
      cat.includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'resolved' && feed.resolved) ||
      (filterStatus === 'unresolved' && !feed.resolved);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">Private Feedback & Complaints</h1>
        <p className="text-sm text-slate-400 mt-1">Review constructive feedback caught privately. Address issues to ensure customer satisfaction.</p>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/5 rounded-3xl p-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by category or complaint text..."
            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all select-text"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 py-2.5 px-3 focus:outline-none focus:border-brand-500 transition-colors w-full"
          >
            <option value="all">All Feedback</option>
            <option value="unresolved">Unresolved Complaints</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      )}

      {/* Feed List */}
      {!loading && (
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {filteredFeedback.length > 0 ? (
              filteredFeedback.map((feed) => (
                <motion.div
                  key={feed.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`glass-panel rounded-3xl p-5 md:p-6 border transition-all text-left ${
                    feed.resolved
                      ? 'border-white/5 opacity-60'
                      : 'border-amber-500/20 shadow-lg shadow-amber-500/2'
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                        feed.resolved
                          ? 'bg-slate-800 border-white/5 text-slate-500'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                          <span>Incident report</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.2 ${
                            feed.resolved
                              ? 'bg-white/10 text-slate-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {feed.resolved ? 'resolved' : feed.severity || 'open'}
                          </span>
                        </h3>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {feed.category} • {new Date(feed.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Resolve toggle */}
                    <button
                      onClick={() => handleToggleResolve(feed)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold font-display transition-colors cursor-pointer ${
                        feed.resolved
                          ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {feed.resolved ? (
                        <><CheckSquare className="w-4 h-4 text-emerald-400" /><span>Resolved</span></>
                      ) : (
                        <><Square className="w-4 h-4 text-slate-500" /><span>Mark Resolved</span></>
                      )}
                    </button>
                  </div>

                  {/* Complaint Body */}
                  <p className="text-sm text-slate-300 leading-relaxed italic bg-white/[0.01] border border-white/5 rounded-2xl p-4 my-4 select-text">
                    "{feed.feedback_text}"
                  </p>

                  {/* Bottom Details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                        {feed.category}
                      </span>
                      {feed.severity && (
                        <span className="bg-white/5 border border-white/10 text-slate-400 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                          {feed.severity}
                        </span>
                      )}
                    </div>
                    {feed.customer_name && (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        From: {feed.customer_name}
                        {feed.customer_email ? ` (${feed.customer_email})` : ''}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-panel rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 border border-white/5 py-16">
                <CheckSquare className="w-10 h-10 text-emerald-500/40" />
                <span className="text-sm font-semibold text-slate-400 font-display">
                  {feedbackList.length === 0 ? 'No feedback submitted yet' : 'Inbox is clean!'}
                </span>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {feedbackList.length === 0
                    ? 'Private feedback from your customers will appear here.'
                    : 'No unresolved customer complaints. Your restaurant service matches high quality standards.'}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
