/**
 * ReviewFlow AI — Supabase Data Service
 *
 * All database read/write operations go through here.
 * Pages import from this file instead of db.js for live Supabase data.
 * Falls back to mock db.js data when Supabase is unavailable or user is unauthenticated.
 */
import { supabase } from '../lib/supabase.js'

const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

if (!BACKEND_URL) {
  console.warn('[supabase_db] VITE_API_URL or VITE_BACKEND_URL is not configured. Backend calls will use the current origin.');
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpUser({ email, password, fullName, restaurantName }) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        restaurant_name: restaurantName,
      },
    },
  })

  if (signUpError) {
    console.error('[supabase_db] signUpUser error:', signUpError.message)
    throw signUpError
  }

  const user = signUpData?.user
  if (!user) {
    throw new Error('Unable to create account. Please try again or contact support.')
  }

  const restaurantPayload = {
    owner_id: user.id,
    restaurant_name: restaurantName || `${fullName}'s Restaurant`,
    owner_name: fullName || '',
    owner_email: email,
    google_review_link: '',
  }

  const { data: restData, error: restError } = await supabase
    .from('restaurants')
    .insert(restaurantPayload)
    .select()
    .single()

  if (restError) {
    console.error('[supabase_db] signUpUser insert restaurant error:', restError.message)
    throw restError
  }

  const defaultToken = `table-1-${Math.random().toString(36).substring(2, 8)}`
  const { error: qrError } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: restData.id,
      qr_token: defaultToken,
      total_scans: 0,
    })

  if (qrError) {
    console.error('[supabase_db] signUpUser default QR insert error:', qrError.message)
  }

  let result = signUpData
  if (!signUpData.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      console.warn('[supabase_db] signUpUser sign-in after signup failed:', signInError.message)
    } else {
      result = signInData
    }
  }

  return result
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}

// ─── Restaurant helpers ───────────────────────────────────────────────────────

/**
 * Get the restaurant row owned by the currently logged-in user.
 * Returns null if not found.
 */
export async function getMyRestaurant() {
  const session = await getSession()
  if (!session) return null

  console.log('[supabase_db] getMyRestaurant — user id:', session.user.id)
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', session.user.id)
    .maybeSingle()

  console.log('[supabase_db] getMyRestaurant data:', data, 'error:', error?.message)
  if (error) {
    console.error('[supabase_db] getMyRestaurant error:', error.message)
    return null
  }
  if (!data) return null

  // Return raw DB columns so consumers use canonical names.
  // Legacy aliases kept for backward compat with existing pages.
  return {
    ...data,
    // canonical DB names (use these going forward)
    // data.restaurant_name, data.google_review_link, data.owner_email,
    // data.owner_name, data.phone, data.address — all present via spread

    // legacy aliases (will be removed once all pages migrated)
    name: data.restaurant_name,
    google_review_url: data.google_review_link,
    notification_email: data.owner_email,
  }
}

/**
 * Create or update the restaurant for the current user.
 */
export async function upsertRestaurant(fields) {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')

  // Map all accepted field names (canonical DB names take priority)
  const dbFields = {}

  // restaurant_name — accept both 'restaurant_name' (canonical) and 'name' (legacy alias)
  if (fields.restaurant_name !== undefined) dbFields.restaurant_name = fields.restaurant_name
  else if (fields.name !== undefined) dbFields.restaurant_name = fields.name

  // google_review_link — accept both canonical and legacy alias
  if (fields.google_review_link !== undefined) dbFields.google_review_link = fields.google_review_link
  else if (fields.google_review_url !== undefined) dbFields.google_review_link = fields.google_review_url

  // owner_email — accept both 'owner_email' (canonical) and 'notification_email' (legacy alias)
  if (fields.owner_email !== undefined) dbFields.owner_email = fields.owner_email
  else if (fields.notification_email !== undefined) dbFields.owner_email = fields.notification_email

  if (fields.owner_name !== undefined) dbFields.owner_name = fields.owner_name
  if (fields.phone     !== undefined) dbFields.phone      = fields.phone
  if (fields.address   !== undefined) dbFields.address    = fields.address

  const payload = {
    owner_id:    session.user.id,
    owner_email: session.user.email,
    ...dbFields,
  }

  // Remove settings columns that do not exist in database schema to avoid insert errors
  delete payload.min_review_threshold;
  delete payload.ai_writing_style;
  delete payload.notifications_enabled;

  console.log('[supabase_db] upsertRestaurant payload:', payload)
  const existing = await getMyRestaurant()

  if (existing) {
    const updatePayload = { ...dbFields };
    delete updatePayload.min_review_threshold;
    delete updatePayload.ai_writing_style;
    delete updatePayload.notifications_enabled;

    console.log('[supabase_db] upsertRestaurant: updating existing id', existing.id, 'with', updatePayload)
    const { data, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single()
    console.log('[supabase_db] upsertRestaurant update data:', data, 'error:', error?.message)
    if (error) throw error
    return {
      ...data,
      name: data.restaurant_name,
      google_review_url: data.google_review_link,
      notification_email: data.owner_email,
    }
  } else {
    console.log('[supabase_db] upsertRestaurant: inserting new record')
    const { data, error } = await supabase
      .from('restaurants')
      .insert(payload)
      .select()
      .single()
    console.log('[supabase_db] upsertRestaurant insert data:', data, 'error:', error?.message)
    if (error) throw error
    return {
      ...data,
      name: data.restaurant_name,
      google_review_url: data.google_review_link,
      notification_email: data.owner_email,
    }
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

/**
 * Fetch all reviews for a restaurant.
 */
export async function getReviews(restaurantId) {
  if (!restaurantId) return []
  console.log('[supabase_db] getReviews for:', restaurantId)
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  console.log('[supabase_db] getReviews data:', data?.length, 'error:', error?.message)
  if (error) {
    console.error('[supabase_db] getReviews error:', error.message)
    return []
  }
  return data || []
}

/**
 * Insert a new review record.
 */
export async function addReview({ restaurantId, overallRating, foodRating, serviceRating,
  ambienceRating, reviewText, sentiment, sentimentScore, redirectedToGoogle }) {
  console.log('[supabase_db] addReview calling backend API...', { restaurantId, overallRating });
  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        overall_rating: overallRating,
        food_rating: foodRating,
        service_rating: serviceRating,
        ambience_rating: ambienceRating,
        review_text: reviewText,
        sentiment: sentiment || 'POSITIVE',
        sentiment_score: sentimentScore || 1.0,
        redirected_to_google: redirectedToGoogle !== false
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log('[supabase_db] addReview API response:', data);
    return data.review || null;
  } catch (err) {
    console.error('[supabase_db] addReview API failed:', err);
    return null;
  }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

/**
 * Fetch all private feedback for a restaurant.
 */
export async function getFeedback(restaurantId) {
  if (!restaurantId) return []
  console.log('[supabase_db] getFeedback for:', restaurantId)
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  console.log('[supabase_db] getFeedback data:', data?.length, 'error:', error?.message)
  if (error) {
    console.error('[supabase_db] getFeedback error:', error.message)
    return []
  }
  return data || []
}

/**
 * Insert a feedback/complaint record.
 */
export async function addFeedback({ restaurantId, customerName, customerEmail,
  category, severity, feedbackText, feedbackCategories, ratingSummary }) {
  console.log('[supabase_db] addFeedback calling backend API...', { restaurantId, category });
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        customer_name: customerName || 'Anonymous',
        customer_email: customerEmail || 'anonymous@example.com',
        feedback_message: feedbackText,
        feedback_categories: feedbackCategories || (category ? [category] : []),
        rating_summary: ratingSummary || 'N/A'
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log('[supabase_db] addFeedback API response:', data);
    return data;
  } catch (err) {
    console.error('[supabase_db] addFeedback API failed:', err);
    return null;
  }
}

/**
 * Toggle resolved status on a feedback item.
 */
export async function toggleFeedbackResolved(feedbackId, currentResolved) {
  const { data, error } = await supabase
    .from('feedback')
    .update({ resolved: !currentResolved })
    .eq('id', feedbackId)
    .select()
    .single()

  if (error) {
    console.error('[supabase_db] toggleFeedbackResolved error:', error.message)
    return null
  }
  return data
}

// ─── QR Codes ─────────────────────────────────────────────────────────────────

/**
 * Get all QR codes for a restaurant.
 */
export async function getQRCodes(restaurantId) {
  if (!restaurantId) return []
  console.log('[supabase_db] getQRCodes for:', restaurantId)
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  console.log('[supabase_db] getQRCodes data:', data?.length, 'error:', error?.message)
  if (error) {
    console.error('[supabase_db] getQRCodes error:', error.message)
    return []
  }
  return data || []
}

/**
 * Create a new QR code entry.
 */
export async function createQRCode({ restaurantId, qrToken, qrImageUrl }) {
  console.log('[supabase_db] createQRCode:', { restaurantId, qrToken })
  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: restaurantId,
      qr_token: qrToken,
      qr_image_url: qrImageUrl || null,
      total_scans: 0,
    })
    .select()
    .single()

  console.log('[supabase_db] createQRCode data:', data, 'error:', error?.message)
  if (error) {
    console.error('[supabase_db] createQRCode error:', error.message)
    return null
  }
  return data
}

/**
 * Delete a QR code.
 */
export async function deleteQRCode(qrId) {
  const { error } = await supabase
    .from('qr_codes')
    .delete()
    .eq('id', qrId)

  if (error) {
    console.error('[supabase_db] deleteQRCode error:', error.message)
    return false
  }
  return true
}

/**
 * Increment the scan count on a QR code by token.
 */
export async function incrementQRScan(qrToken) {
  const { data: qr } = await supabase
    .from('qr_codes')
    .select('id, total_scans')
    .eq('qr_token', qrToken)
    .maybeSingle()

  if (!qr) return
  await supabase
    .from('qr_codes')
    .update({ total_scans: (qr.total_scans || 0) + 1 })
    .eq('id', qr.id)
}

// ─── Stats (for Overview / Analytics) ────────────────────────────────────────

/**
 * Get aggregate stats for a restaurant from Supabase activity_logs.
 */
export async function getRestaurantStats(restaurantId) {
  if (!restaurantId) return { totalReviews: 0, totalFeedback: 0, avgRating: 0, totalScans: 0, redirects: 0, redirectRate: 0 }
  console.log('[supabase_db] getRestaurantStats calling backend API...', restaurantId);
  try {
    const response = await fetch(`${BACKEND_URL}/api/activity/stats?restaurant_id=${restaurantId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log('[supabase_db] getRestaurantStats API response:', data);
    return data;
  } catch (err) {
    console.error('[supabase_db] getRestaurantStats API failed:', err);
    return { totalReviews: 0, totalFeedback: 0, avgRating: 0, totalScans: 0, redirects: 0, redirectRate: 0 };
  }
}

/**
 * Log customer activity via the backend API.
 */
export async function logActivity({ restaurantId, activityType, customerName, rating, reviewText, feedbackText, metadata }) {
  console.log('[supabase_db] logActivity calling backend API...', { restaurantId, activityType });
  try {
    const response = await fetch(`${BACKEND_URL}/api/activity/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        activity_type: activityType,
        customer_name: customerName || 'Anonymous',
        rating: rating,
        review_text: reviewText || '',
        feedback_text: feedbackText || '',
        metadata: metadata || {}
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log('[supabase_db] logActivity API response:', data);
    return data;
  } catch (err) {
    console.error('[supabase_db] logActivity API failed:', err);
    return null;
  }
}

/**
 * Get all activity logs for a restaurant.
 */
export async function getActivityLogs(restaurantId, limit = 100) {
  if (!restaurantId) return [];
  console.log('[supabase_db] getActivityLogs calling backend API...', restaurantId);
  try {
    const response = await fetch(`${BACKEND_URL}/api/activity/list?restaurant_id=${restaurantId}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    console.log('[supabase_db] getActivityLogs API response:', data);
    return data;
  } catch (err) {
    console.error('[supabase_db] getActivityLogs API failed:', err);
    return [];
  }
}
