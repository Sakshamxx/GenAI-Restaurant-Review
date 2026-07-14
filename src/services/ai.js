/**
 * ReviewFlow AI - AI Service
 *
 * Calls the FastAPI backend (Gemini) for real review generation.
 * Falls back to mock generation if the backend is unavailable.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Generate 3 review suggestions by calling the FastAPI/Gemini backend.
 * Falls back to mock reviews if the backend is unreachable.
 *
 * @param {Object} ratings - { food: number, service: number, ambience: number }
 * @param {Object} selectedTags - { food: string[], service: string[], ambience: string[] }
 * @returns {Promise<string[]>} List of 3 suggested review texts
 */
export async function generateMockReviewSuggestions(ratings, selectedTags) {
  const foodRating = ratings.food || 5;
  const serviceRating = ratings.service || 5;
  const ambienceRating = ratings.ambience || 5;

  const foodTags = (selectedTags.food || []).slice(0, 3);
  const serviceTags = (selectedTags.service || []).slice(0, 3);
  const ambienceTags = (selectedTags.ambience || []).slice(0, 3);

  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_rating: foodRating,
        service_rating: serviceRating,
        ambience_rating: ambienceRating,
        food_tags: foodTags,
        service_tags: serviceTags,
        ambience_tags: ambienceTags,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    if (data.reviews && data.reviews.length === 3) {
      return data.reviews;
    }
    throw new Error('Unexpected response format from backend');

  } catch (err) {
    console.warn('[ai.js] Backend unreachable, using local mock fallback:', err.message);
    return _mockReviews(foodRating, serviceRating, ambienceRating, foodTags, serviceTags, ambienceTags);
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
 * @returns {Promise<boolean>} true if submitted successfully
 */
export async function submitFeedbackToBackend({ restaurantId, tableNumber, feedbackCategories, feedbackMessage }) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId || 'unknown',
        table_number: tableNumber || 'Unknown Table',
        feedback_categories: feedbackCategories || [],
        feedback_message: feedbackMessage || '',
      }),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch (err) {
    console.warn('[ai.js] Feedback submission to backend failed:', err.message);
    return false;
  }
}

/**
 * Predict whether an experience is positive or negative/neutral.
 * Emulates a local BERT sentiment classifier.
 *
 * @param {Object} ratings - { food: number, service: number, ambience: number }
 * @param {Object} selectedTags - All selected tags
 * @returns {Object} { sentiment: 'POSITIVE' | 'NEGATIVE', score: number, requiresPrivateFeedback: boolean }
 */
export function classifySentiment(ratings, selectedTags) {
  const food = ratings.food || 5;
  const service = ratings.service || 5;
  const ambience = ratings.ambience || 5;

  const averageRating = (food + service + ambience) / 3;

  // Check if there are any explicitly critical negative tags selected
  const negativeTags = ['Bland', 'Overpriced', 'Slow', 'Unresponsive', 'Noisy', 'Crowded'];
  const allTags = [...(selectedTags.food || []), ...(selectedTags.service || []), ...(selectedTags.ambience || [])];

  const hasNegativeTags = allTags.some(tag => negativeTags.includes(tag));

  // If average rating is 3.5 or less, or if they have negative tags, classify as NEGATIVE
  const isNegative = averageRating <= 3.5 || hasNegativeTags || food <= 3 || service <= 3;

  return {
    sentiment: isNegative ? 'NEGATIVE' : 'POSITIVE',
    score: isNegative
      ? Math.max(0.1, 1 - (averageRating / 5))
      : Math.min(0.99, averageRating / 5),
    requiresPrivateFeedback: isNegative
  };
}

// ─── Local fallback mock reviews ────────────────────────────────────────────

function _mockReviews(foodRating, serviceRating, ambienceRating, fTags, sTags, aTags) {
  // Simulate slight delay
  const foodDesc = fTags.length > 0
    ? `The food was exceptionally ${fTags.join(', ').toLowerCase()}`
    : foodRating >= 4 ? 'The dishes were delicious and flavorful' : 'The food was standard';

  const serviceDesc = sTags.length > 0
    ? `the service was extremely ${sTags.join(', ').toLowerCase()}`
    : serviceRating >= 4 ? 'the staff was friendly and attentive' : 'the service was average';

  const ambienceDesc = aTags.length > 0
    ? `ambience that felt very ${aTags.join(', ').toLowerCase()}`
    : ambienceRating >= 4 ? 'a clean, comfortable atmosphere' : 'a casual setting';

  const avgRating = (foodRating + serviceRating + ambienceRating) / 3;

  if (avgRating >= 4) {
    return [
      `Incredible dining experience! ${foodDesc}. Top-notch execution throughout, paired with ${serviceDesc}. The restaurant offers ${ambienceDesc}. Highly recommend, we will definitely be coming back!`,
      `Absolutely loved it! Outstanding food (so ${fTags.length > 0 ? fTags[0].toLowerCase() : 'fresh'}) and the service was ${sTags.length > 0 ? sTags[0].toLowerCase() : 'attentive'}. The atmosphere is ${aTags.length > 0 ? aTags[0].toLowerCase() : 'inviting'}. 5 stars!`,
      `Had a fantastic time here tonight. ${foodDesc}, and I was really impressed by how ${sTags.length > 0 ? sTags.join(' and ').toLowerCase() : 'professional'} the team was. The setting is ${aTags.length > 0 ? aTags.join(', ').toLowerCase() : 'cozy'}. Great spot!`
    ];
  } else if (avgRating >= 2.5) {
    return [
      `Had a decent visit here. While ${foodDesc}, there is room for improvement. The service was ${sTags.length > 0 ? sTags.join(', ').toLowerCase() : 'acceptable'}, and the vibe was ${aTags.length > 0 ? aTags.join(', ').toLowerCase() : 'average'}. Standard experience overall.`,
      `Average experience. The food was ${fTags.length > 0 ? fTags.join(', ').toLowerCase() : 'okay'} but ${serviceDesc}. It has a ${aTags.length > 0 ? aTags.join(', ').toLowerCase() : 'casual'} ambience. Fine for a quick bite.`,
      `Mixed thoughts on this spot. ${foodDesc}, but noticed a few service bottlenecks—mostly ${sTags.length > 0 ? sTags.join(', ').toLowerCase() : 'average service'}. Decent overall, but could be polished further.`
    ];
  } else {
    return [
      `Very disappointing visit. The food was ${fTags.length > 0 ? fTags.join(', ').toLowerCase() : 'bland'} and it felt overpriced. Service was ${sTags.length > 0 ? sTags.join(', ').toLowerCase() : 'slow and unresponsive'}. Not up to standards.`,
      `Would not recommend. The ambience was ${aTags.length > 0 ? aTags.join(', ').toLowerCase() : 'noisy/crowded'}, service was extremely lagging, and the food was substandard. Significant improvement needed.`,
      `Really let down by our experience. The staff was ${sTags.length > 0 ? sTags.join(', ').toLowerCase() : 'unprofessional'} and food fell way short of expectations. Hoping management takes feedback seriously.`
    ];
  }
}
