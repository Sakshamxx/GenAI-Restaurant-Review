import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase.js'

export default function ReviewPage() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!restaurantId) {
        setError('This review link is invalid.')
        setLoading(false)
        return
      }

      try {
        const { data, error: dbError } = await supabase
          .from('restaurants')
          .select('id, restaurant_name, google_review_link')
          .eq('id', restaurantId)
          .maybeSingle()

        if (dbError) throw dbError
        if (!data) {
          setError('This review link could not be matched to a restaurant.')
          setLoading(false)
          return
        }

        setRestaurant(data)
        sessionStorage.setItem('reviewflow_restaurant_id', data.id)
        sessionStorage.setItem('reviewflow_restaurant_name', data.restaurant_name || '')
        if (data.google_review_link) {
          sessionStorage.setItem('reviewflow_google_url', data.google_review_link)
        }
      } catch (err) {
        setError('Unable to load this review experience right now.')
      } finally {
        setLoading(false)
      }
    }

    loadRestaurant()
  }, [restaurantId])

  useEffect(() => {
    if (!loading && restaurant) {
      const params = new URLSearchParams()
      params.set('restaurantId', restaurant.id)
      if (tableId) params.set('tableId', tableId)
      navigate(`/qr?${params.toString()}`, { replace: true })
    }
  }, [loading, restaurant, navigate, restaurantId, tableId])

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 text-center"
      >
        <h1 className="text-2xl font-display font-bold text-white">Review Flow</h1>
        <p className="mt-3 text-sm text-slate-400">
          {loading
            ? 'Preparing your review experience…'
            : error
              ? error
              : 'Redirecting you to the review destination…'}
        </p>
        {!loading && !restaurant?.google_review_link && (
          <button
            onClick={() => navigate('/feedback')}
            className="mt-6 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Continue to feedback form
          </button>
        )}
      </motion.div>
    </div>
  )
}
