/**
 * ReviewFlow AI - AI Service
 *
 * Calls the FastAPI backend (Gemini) for real review generation.
 * Falls back to mock generation if the backend is unavailable.
 */

// VITE_ prefix = exposed via import.meta.env (Vite native pattern)
const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

/**
 * Generate 3 review suggestions by calling the FastAPI/Gemini backend.
 * Falls back to mock reviews if the backend is unreachable.
 *
 * @param {Object} ratings - { food: number, service: number, ambience: number }
 * @param {Object} selectedTags - { food: string[], service: string[], ambience: string[] }
 * @returns {Promise<string[]>} List of 3 suggested review texts
 */
export async function generateMockReviewSuggestions(ratings, selectedTags, restaurantId) {
  const foodRating = ratings.food || 5;
  const serviceRating = ratings.service || 5;
  const ambienceRating = ratings.ambience || 5;

  const foodTags = (selectedTags.food || []).slice(0, 3);
  const serviceTags = (selectedTags.service || []).slice(0, 3);
  const ambienceTags = (selectedTags.ambience || []).slice(0, 3);

  try {
    // Use centralized API wrapper when available to generate suggestions.
    // Do NOT send ratings as model input — only provide restaurant id and tags/context.
    const payload = {
      reviewText: '',
      restaurantId: restaurantId || null,
      count: 3,
    }

    // dynamic import to avoid cyclic deps in some bundlers
    const api = await import('./api.js')
    const data = await api.generateSuggestions(payload)
    if (data && Array.isArray(data.reviews) && data.reviews.length === 3) return data.reviews
    throw new Error('Unexpected response format from backend')
  } catch (err) {
    console.warn('[ai.js] Backend unreachable, using local mock fallback:', err.message)
    return _mockReviews(foodRating, serviceRating, ambienceRating, foodTags, serviceTags, ambienceTags)
  }
}

/**
 * Submit feedback to the backend API (triggers owner email notification).
 *
 * @param {Object} params
 * @param {string} params.restaurantId
 * @param {string} params.tableNumber
 * @param {string[]} params.feedbackCategories
 * @param {string} params.feedbackMessage
 * @param {string} params.ratingSummary - e.g. "Food: 2/5, Service: 3/5, Ambience: 2/5"
 * @returns {Promise<boolean>} true if submitted successfully
 */
export async function submitFeedbackToBackend({ restaurantId, tableNumber, feedbackMessage, ratingSummary }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId || 'unknown',
        customer_name: 'Anonymous',
        customer_email: 'anonymous@example.com',
        feedback_message: feedbackMessage || '',
        rating_summary: ratingSummary || 'N/A',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[ai.js] Feedback submission failed:', response.status, errData);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[ai.js] Feedback submission to backend failed:', err.message);
    return false;
  }
}
// Note: local rating-based sentiment heuristics were removed to prevent
// rating leakage and to ensure ML models are the single source of truth.

// ─── Local fallback mock reviews ────────────────────────────────────────────

function _mockReviews() {
  // Minimal, non-committal fallback suggestions that do not infer sentiment from ratings.
  return [
    "I had a memorable experience—the staff were attentive and the menu had great variety.",
    "Overall it was pleasant. A few small things could be improved, but we enjoyed our meal.",
    "I appreciate the effort from the team; there were highlights and opportunities for improvement."
  ];
}
