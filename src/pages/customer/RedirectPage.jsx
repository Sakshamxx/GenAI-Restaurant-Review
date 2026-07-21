import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function RedirectPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const destination = params.get('destination') || ''
  const restaurantName = params.get('restaurantName') || sessionStorage.getItem('reviewflow_restaurant_name') || 'your restaurant'

  useEffect(() => {
    if (!destination) {
      const timeout = window.setTimeout(() => navigate('/success', { replace: true }), 1800)
      return () => window.clearTimeout(timeout)
    }

    const timer = window.setTimeout(() => {
      window.location.assign(destination)
    }, 1800)

    const interval = window.setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [destination, navigate])

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 text-center"
      >
        <h1 className="text-2xl font-display font-bold text-white">Thank You</h1>
        <p className="mt-3 text-sm text-slate-400">
          Your review has been submitted successfully.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {restaurantName ? `We’re taking you to ${restaurantName}’s review destination.` : 'We’re taking you to the configured review destination.'}
        </p>
        <p className="mt-6 text-sm font-semibold text-brand-300">
          Redirecting in {countdown}s...
        </p>
        {!destination && (
          <p className="mt-3 text-xs text-slate-500">
            No review destination was configured, so you’ll be taken back to the confirmation page.
          </p>
        )}
      </motion.div>
    </div>
  )
}
