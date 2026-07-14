/**
 * ReviewFlow AI — Supabase Data Service
 *
 * All database read/write operations go through here.
 * Pages import from this file instead of db.js for live Supabase data.
 * Falls back to mock db.js data when Supabase is unavailable or user is unauthenticated.
 */
import { supabase } from '../lib/supabase.js'

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpUser({ email, password, fullName, restaurantName }) {
  // 1. Create Supabase Auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })
  if (error) throw error

  // To be absolutely robust and create immediate active session, we perform a sign in.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  const user = signInData.user
  if (!user) throw new Error('No user returned after signing up and in')

  // 2. Create the first restaurant record linked to the owner's ID
  const { data: restData, error: restError } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      restaurant_name: restaurantName,
      owner_name: fullName,
      owner_email: email,
      google_review_link: ''
    })
    .select()
    .single()

  if (restError) {
    console.error('Error inserting restaurant on signup:', restError.message)
    throw restError
  }

  // 3. Create a default tableside QR code placard for Table 1
  const defaultToken = `table-1-${Math.random().toString(36).substring(2, 8)}`
  const { error: qrError } = await supabase
    .from('qr_codes')
    .insert({
      restaurant_id: restData.id,
      qr_token: defaultToken,
      total_scans: 0
    })

  if (qrError) {
    console.error('Error inserting default QR code on signup:', qrError.message)
  }

  return signInData
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

  console.log('[supabase_db] upsertRestaurant payload:', payload)
  const existing = await getMyRestaurant()

  if (existing) {
    console.log('[supabase_db] upsertRestaurant: updating existing id', existing.id, 'with', dbFields)
    const { data, error } = await supabase
      .from('restaurants')
      .update(dbFields)
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
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      restaurant_id: restaurantId,
      overall_rating: overallRating,
      food_rating: foodRating,
      service_rating: serviceRating,
      ambience_rating: ambienceRating,
      review_text: reviewText,
      sentiment: sentiment || 'POSITIVE',
      sentiment_score: sentimentScore || 1.0,
      redirected_to_google: redirectedToGoogle || true,
    })
    .select()
    .single()

  if (error) {
    console.error('[supabase_db] addReview error:', error.message)
    return null
  }
  return data
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
  category, severity, feedbackText }) {
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      restaurant_id: restaurantId,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      category: category || 'Other',
      severity: severity || 'medium',
      feedback_text: feedbackText,
      resolved: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[supabase_db] addFeedback error:', error.message)
    return null
  }
  return data
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
 * Get aggregate stats for a restaurant from Supabase.
 */
export async function getRestaurantStats(restaurantId) {
  if (!restaurantId) return { totalReviews: 0, totalFeedback: 0, avgRating: 0, totalScans: 0 }

  const [reviewsResp, feedbackResp, qrResp] = await Promise.all([
    supabase.from('reviews').select('overall_rating, redirected_to_google', { count: 'exact' })
      .eq('restaurant_id', restaurantId),
    supabase.from('feedback').select('id', { count: 'exact' })
      .eq('restaurant_id', restaurantId),
    supabase.from('qr_codes').select('total_scans')
      .eq('restaurant_id', restaurantId),
  ])

  const reviews = reviewsResp.data || []
  const totalReviews = reviewsResp.count || reviews.length
  const totalFeedback = feedbackResp.count || 0
  const totalScans = (qrResp.data || []).reduce((sum, qr) => sum + (qr.total_scans || 0), 0)
  const redirects = reviews.filter(r => r.redirected_to_google).length

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / reviews.length)
    : 0

  return {
    totalReviews,
    totalFeedback,
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalScans,
    redirects,
    redirectRate: totalScans > 0 ? Math.round((redirects / totalScans) * 100) : 0,
  }
}
