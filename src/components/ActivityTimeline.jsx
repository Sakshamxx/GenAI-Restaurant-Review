/**
 * Activity Timeline Component
 * Real-time activity feed showing customer interactions
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Link2, AlertTriangle, Smartphone, RefreshCw, Loader2 } from 'lucide-react'
import { getActivityLogs } from '../../services/supabase_db.js'
import { Toast } from '../../lib/errorHandler.js'

export default function ActivityTimeline({ restaurantId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, review, redirect, complaint, qr

  useEffect(() => {
    loadActivities()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000)
    return () => clearInterval(interval)
  }, [restaurantId])

  async function loadActivities() {
    if (!restaurantId) return

    try {
      setLoading(true)
      const data = await getActivityLogs(restaurantId)
      setActivities(data || [])
    } catch (error) {
      console.error('Failed to load activities:', error)
      Toast.error('Failed to load activity feed')
    } finally {
      setLoading(false)
    }
  }

  function getActivityIcon(type) {
    switch (type) {
      case 'review_submitted':
        return <MessageSquare size={20} className="text-blue-500" />
      case 'google_redirect':
        return <Link2 size={20} className="text-green-500" />
      case 'complaint_submitted':
        return <AlertTriangle size={20} className="text-red-500" />
      case 'qr_scanned':
        return <Smartphone size={20} className="text-purple-500" />
      default:
        return <div size={20} className="text-gray-500" />
    }
  }

  function getActivityLabel(type) {
    switch (type) {
      case 'review_submitted':
        return 'Review Submitted'
      case 'google_redirect':
        return 'Google Review'
      case 'complaint_submitted':
        return 'Complaint'
      case 'qr_scanned':
        return 'QR Scan'
      default:
        return 'Activity'
    }
  }

  function getActivityColor(type) {
    switch (type) {
      case 'review_submitted':
        return 'bg-blue-50 border-blue-200'
      case 'google_redirect':
        return 'bg-green-50 border-green-200'
      case 'complaint_submitted':
        return 'bg-red-50 border-red-200'
      case 'qr_scanned':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.activity_type === filter)

  const filterOptions = [
    { value: 'all', label: 'All', count: activities.length },
    { value: 'review_submitted', label: 'Reviews', count: activities.filter(a => a.activity_type === 'review_submitted').length },
    { value: 'google_redirect', label: 'Redirects', count: activities.filter(a => a.activity_type === 'google_redirect').length },
    { value: 'complaint_submitted', label: 'Complaints', count: activities.filter(a => a.activity_type === 'complaint_submitted').length },
    { value: 'qr_scanned', label: 'Scans', count: activities.filter(a => a.activity_type === 'qr_scanned').length },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Timeline</h2>
          <p className="text-gray-600 text-sm mt-1">Real-time updates from your customers</p>
        </div>
        <button
          onClick={loadActivities}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {option.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              filter === option.value
                ? 'bg-blue-700'
                : 'bg-gray-300'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <MessageSquare size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">No activities yet</p>
            <p className="text-gray-500 text-sm">Customer activities will appear here</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredActivities.map((activity, index) => (
              <motion.div
                key={`${activity.id || index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`border-2 rounded-lg p-4 ${getActivityColor(activity.activity_type)} hover:shadow-md transition-shadow`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 pt-1">
                    {getActivityIcon(activity.activity_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {getActivityLabel(activity.activity_type)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {activity.description ||
                            activity.review_text ||
                            activity.feedback_text ||
                            `Activity on ${new Date(activity.created_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(activity.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        {activity.metadata.sentiment && (
                          <p>💭 Sentiment: <span className="font-medium">{activity.metadata.sentiment}</span></p>
                        )}
                        {activity.metadata.category && (
                          <p>📝 Category: <span className="font-medium">{activity.metadata.category}</span></p>
                        )}
                        {activity.rating && (
                          <p>⭐ Rating: <span className="font-medium">{activity.rating}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <p className="ml-2 text-gray-600">Loading activities...</p>
        </div>
      )}
    </div>
  )
}

function formatTime(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
