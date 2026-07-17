import axios from 'axios'
import { Toast, apiCall } from '../lib/errorHandler.js'

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || ''

if (!BASE_URL) {
  console.warn('[api] VITE_API_URL or VITE_BACKEND_URL is not configured. Requests will use the current origin.');
}

const client = axios.create({
  baseURL: BASE_URL || undefined,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor for auth token
client.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = localStorage.getItem('sb-auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor for error handling
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('sb-auth-token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/**
 * Submit a customer review
 * @param {Object} payload - Review data
 * @returns {Promise<Object>} Response with review and ML predictions
 */
export async function submitReview(payload) {
  return apiCall(
    async () => {
      const body = {
        restaurant_id: payload.restaurantId,
        overall_rating: payload.overallRating,
        food_rating: payload.foodRating,
        service_rating: payload.serviceRating,
        ambience_rating: payload.ambienceRating,
        review_text: payload.reviewText,
        redirected_to_google: payload.redirectedToGoogle !== false,
      }
      const resp = await client.post('/api/reviews/submit', body)
      return resp.data
    },
    {
      retries: 2,
      timeout: 15000,
      onRetry: (attempt) => {
        console.log(`Retrying review submission (attempt ${attempt})`)
      },
      onError: (error) => {
        Toast.error('Failed to submit review. Please try again.')
      },
    }
  )
}

/**
 * Submit customer feedback/complaint
 * @param {Object} payload - Feedback data
 * @returns {Promise<Object>} Response with feedback confirmation
 */
export async function submitFeedback(payload) {
  return apiCall(
    async () => {
      const body = {
        restaurant_id: payload.restaurantId,
        customer_name: payload.customerName || 'Anonymous',
        customer_email: payload.customerEmail || 'anonymous@example.com',
        feedback_message: payload.feedbackText,
        feedback_categories: payload.feedbackCategories || (payload.category ? [payload.category] : []),
        rating_summary: payload.ratingSummary || 'N/A'
      }
      const resp = await client.post('/api/feedback/submit', body)
      Toast.success('Thank you! Your feedback has been submitted.')
      return resp.data
    },
    {
      retries: 2,
      onError: () => {
        Toast.error('Failed to submit feedback. Please try again.')
      },
    }
  )
}

/**
 * Get ML model health status
 * @returns {Promise<Object>} Model health data
 */
export async function getModelHealth() {
  try {
    const resp = await client.get('/health/models', { timeout: 5000 })
    return resp.data
  } catch (error) {
    console.error('Failed to get model health:', error)
    return {
      sentiment_model: 'unknown',
      complaint_model: 'unknown',
      severity_model: 'unknown',
    }
  }
}

/**
 * Generate AI review suggestions
 * @param {Object} payload - Review data for suggestion generation
 * @returns {Promise<Object>} Generated suggestions
 */
export async function generateSuggestions(payload) {
  return apiCall(
    async () => {
      const body = {
        review_text: payload.reviewText || '',
        restaurant_id: payload.restaurantId || null,
        count: payload.count || 3,
        food_rating: payload.foodRating ?? payload.ratings?.food ?? 5,
        service_rating: payload.serviceRating ?? payload.ratings?.service ?? 5,
        ambience_rating: payload.ambienceRating ?? payload.ratings?.ambience ?? 5,
        food_tags: payload.foodTags || [],
        service_tags: payload.serviceTags || [],
        ambience_tags: payload.ambienceTags || [],
      }
      const resp = await client.post('/api/reviews/generate', body)
      // Accept either 'suggestions' or 'reviews' key from backend
      const suggestions = resp.data.suggestions || resp.data.reviews || []
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('No suggestions generated')
      }
      return resp.data
    },
    {
      retries: 1,
      timeout: 30000, // Longer timeout for AI generation
      onError: () => {
        Toast.warning('Could not generate suggestions. Please try again.')
      },
    }
  )
}

/**
 * Get restaurant reviews
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Array>} List of reviews
 */
export async function getRestaurantReviews(restaurantId) {
  return apiCall(
    async () => {
      const resp = await client.get(`/api/restaurants/${restaurantId}/reviews`)
      return resp.data.reviews || []
    },
    { retries: 1 }
  )
}

/**
 * Get restaurant analytics
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Object>} Analytics data
 */
export async function getAnalytics(restaurantId) {
  return apiCall(
    async () => {
      const resp = await client.get(`/api/restaurants/${restaurantId}/analytics`)
      return resp.data
    },
    { retries: 1 }
  )
}

/**
 * Get activity logs
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Array>} Activity logs
 */
export async function getActivityLogs(restaurantId) {
  return apiCall(
    async () => {
      const resp = await client.get(`/api/restaurants/${restaurantId}/activity`)
      return resp.data.activities || []
    },
    { retries: 1 }
  )
}

/**
 * Get QR code information
 * @param {string} qrToken - QR token
 * @returns {Promise<Object>} QR code data
 */
export async function getQRCode(qrToken) {
  return apiCall(
    async () => {
      const resp = await client.get(`/api/qr/${qrToken}`)
      return resp.data
    },
    { retries: 1 }
  )
}

/**
 * Generate new QR codes
 * @param {Object} payload - QR generation data
 * @returns {Promise<Object>} Generated QR codes
 */
export async function generateQRCodes(payload) {
  return apiCall(
    async () => {
      const body = {
        restaurant_id: payload.restaurantId,
        table_count: payload.tableCount || 1,
      }
      const resp = await client.post('/api/qr/generate', body)
      Toast.success(`${payload.tableCount} QR codes generated successfully`)
      return resp.data
    },
    { retries: 1 }
  )
}

/**
 * Delete QR code
 * @param {string} qrToken - QR token to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteQRCode(qrToken) {
  return apiCall(
    async () => {
      const resp = await client.delete(`/api/qr/${qrToken}`)
      Toast.success('QR code deleted')
      return resp.data
    },
    { retries: 1 }
  )
}

/**
 * Update restaurant settings
 * @param {Object} payload - Restaurant settings
 * @returns {Promise<Object>} Updated settings
 */
export async function updateRestaurantSettings(payload) {
  return apiCall(
    async () => {
      const body = {
        restaurant_name: payload.restaurantName,
        address: payload.address,
        phone: payload.phone,
        google_review_link: payload.googleReviewLink,
        notification_email: payload.notificationEmail,
      }
      const resp = await client.post('/api/restaurants/settings', body)
      Toast.success('Settings saved successfully')
      return resp.data
    },
    { retries: 1 }
  )
}

export default client
