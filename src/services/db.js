/**
 * ReviewFlow AI - Mock Local Database Service
 * 
 * Simulates a cloud database (like Supabase) using LocalStorage.
 * This links the QR feedback experience with the Owner Dashboard in real-time.
 */

const REVIEWS_KEY = 'reviewflow_reviews';
const FEEDBACK_KEY = 'reviewflow_feedback';
const QR_CODES_KEY = 'reviewflow_qr_codes';
const SCANS_COUNT_KEY = 'reviewflow_scans_count';
const REDIRECTS_COUNT_KEY = 'reviewflow_redirects_count';
const RESTAURANTS_KEY = 'reviewflow_restaurants';
const ACTIVE_RESTAURANT_KEY = 'reviewflow_active_restaurant';

// Default mock data to populate if storage is empty
const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    customerName: 'Marcus Vance',
    stars: { food: 5, service: 5, ambience: 4 },
    tags: ['Fresh', 'Flavorful', 'Fast', 'Clean'],
    text: 'Incredible dining experience! The dishes were fresh and flavorful. Top-notch execution throughout, paired with fast service. Highly recommend, we will definitely be coming back!',
    platform: 'Google Review',
    status: 'Redirected',
    date: '2026-07-08T19:30:00Z',
    table: 'Table 4'
  },
  {
    id: 'rev-2',
    customerName: 'Sarah Jenkins',
    stars: { food: 5, service: 4, ambience: 5 },
    tags: ['Delicious', 'Authentic', 'Cozy', 'Premium'],
    text: 'Absolutely loved it! Outstanding food and the service was attentive. The atmosphere is cozy. 5 stars!',
    platform: 'Google Review',
    status: 'Redirected',
    date: '2026-07-08T18:15:00Z',
    table: 'Table 12'
  },
  {
    id: 'rev-3',
    customerName: 'Elena Rostova',
    stars: { food: 4, service: 5, ambience: 4 },
    tags: ['Friendly', 'Helpful', 'Clean', 'Value for Money'],
    text: 'Had a fantastic time here tonight. The food was value for money and tasty. I was really impressed by how friendly the team was.',
    platform: 'Google Review',
    status: 'Redirected',
    date: '2026-07-07T21:45:00Z',
    table: 'Bar 2'
  },
  {
    id: 'rev-4',
    customerName: 'David K.',
    stars: { food: 4, service: 4, ambience: 4 },
    tags: ['Value for Money', 'Standard', 'Casual'],
    text: 'Decent dinner. Food is standard but good portion size and friendly staff. Clean table.',
    platform: 'Google Review',
    status: 'Drafted',
    date: '2026-07-07T12:00:00Z',
    table: 'Table 6'
  }
];

const INITIAL_FEEDBACK = [
  {
    id: 'feed-1',
    stars: { food: 2, service: 1, ambience: 3 },
    tags: ['Service Delay', 'Staff Behaviour'],
    comment: 'Waited over 40 minutes for our main course. The server seemed completely indifferent and ignored our table when we asked for water. Very poor training.',
    status: 'Unread',
    date: '2026-07-08T21:10:00Z',
    table: 'Table 8',
    resolved: false
  },
  {
    id: 'feed-2',
    stars: { food: 1, service: 3, ambience: 2 },
    tags: ['Food Quality', 'Noise Level'],
    comment: 'The steak was cold and tasted bland. Additionally, the music was deafeningly loud. We could barely hear each other speak. Disappointing since we usually love this place.',
    status: 'Reviewed',
    date: '2026-07-08T15:20:00Z',
    table: 'Table 3',
    resolved: false
  },
  {
    id: 'feed-3',
    stars: { food: 3, service: 2, ambience: 4 },
    tags: ['Billing Issue'],
    comment: 'Charged twice for the appetizers. Took 15 minutes to sort it out with the supervisor. The environment was clean and nice, but the cashier error wasted our time.',
    status: 'Resolved',
    date: '2026-07-06T20:05:00Z',
    table: 'Table 14',
    resolved: true
  }
];

const INITIAL_QR_CODES = [
  { id: 'qr-1', name: 'Table 1', scans: 142, redirects: 98, feedback: 2, code: 'T1' },
  { id: 'qr-2', name: 'Table 2', scans: 88, redirects: 54, feedback: 1, code: 'T2' },
  { id: 'qr-3', name: 'Table 3', scans: 120, redirects: 72, feedback: 4, code: 'T3' },
  { id: 'qr-4', name: 'Table 4', scans: 210, redirects: 165, feedback: 0, code: 'T4' },
  { id: 'qr-5', name: 'Bar Counter', scans: 95, redirects: 68, feedback: 1, code: 'BAR' },
  { id: 'qr-6', name: 'VIP Patio', scans: 74, redirects: 59, feedback: 0, code: 'PATIO' }
];

// Initialize DB if not present
export function initDB() {
  if (!localStorage.getItem(REVIEWS_KEY)) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
  }
  if (!localStorage.getItem(FEEDBACK_KEY)) {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(INITIAL_FEEDBACK));
  }
  if (!localStorage.getItem(QR_CODES_KEY)) {
    localStorage.setItem(QR_CODES_KEY, JSON.stringify(INITIAL_QR_CODES));
  }
  if (!localStorage.getItem(SCANS_COUNT_KEY)) {
    localStorage.setItem(SCANS_COUNT_KEY, '739');
  }
  if (!localStorage.getItem(REDIRECTS_COUNT_KEY)) {
    localStorage.setItem(REDIRECTS_COUNT_KEY, '516');
  }
}

// Ensure database is initialized immediately on script load
initDB();

// Default multi-restaurant data
const DEFAULT_RESTAURANTS = [
  {
    id: 'violet-orchid',
    name: 'The Violet Orchid',
    googleReviewUrl: 'https://www.google.com/search?q=sandoz&oq=sandoz&gs_lcrp=EgZjaHJvbWUqDQgAEAAY4wIYsQMYgAQyDQgAEAAY4wIYsQMYgAQyEAgBEC4YxwEYsQMY0QMYgAQyEwgCEC4YrwEYxwEYsQMYgAQYjgUyBwgDEAAYgAQyDQgEEC4YrwEYxwEYgAQyEAgFEC4YrwEYxwEYgAQYjgUyEAgGEC4YrwEYxwEYgAQYjgUyBwgHEAAYgAQyBwgIEAAYgAQyEAgJEC4YrwEYxwEYgAQYjgXSAQgxMjg4ajBqN6gCCLACAfEFCqTYu2YtdVQ&sourceid=chrome&source=chrome.ob&ie=UTF-8#sv=CAESzAEKuAEStQEKd0FKaVQ0dEllVnQ4VkMyQUtJQUE1V2h1REZEWXRpZjNLOGdlVkFQNjNlSHdZUFlMQ0ZkTXpDVVNGVzczWUhHY1lkb3BEcTlTR0p4bl80T3ZxQnVsak9WQlRjNUlfV0YtRHVqWVhyXzI2UElHODg0SkxCX2lXUU5zEhZ3VEpXYXBmQkhORHc0LUVQaFBhTEtRGiJBRHNyOWZSWkNGbFE3eXJCUENCSUpvUlVTUWFPZ3hEVGR3EgQ4MDUxGgEzKgAwADgBQAAYACD548uyAUoCEAI',
    notificationEmail: 'manager@violetorchid.com',
  },
  {
    id: 'crimson-feast',
    name: 'Crimson Feast',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=example2',
    notificationEmail: 'manager@crimsonfeast.com',
  },
  {
    id: 'azure-bites',
    name: 'Azure Bites',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=example3',
    notificationEmail: 'manager@azurebites.com',
  }
];

export const db = {
  // Reviews (Positive redirected experiences)
  getReviews: () => {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
  },
  
  addReview: (review) => {
    const reviews = db.getReviews();
    const newReview = {
      id: `rev-${Date.now()}`,
      date: new Date().toISOString(),
      platform: 'Google Review',
      status: 'Redirected',
      table: 'Table ' + (Math.floor(Math.random() * 15) + 1), // Mock table association
      ...review
    };
    reviews.unshift(newReview);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    
    // Increment redirects count
    const redirects = parseInt(localStorage.getItem(REDIRECTS_COUNT_KEY) || '0', 10);
    localStorage.setItem(REDIRECTS_COUNT_KEY, (redirects + 1).toString());
    
    return newReview;
  },

  // Feedback (Private complaint experiences)
  getFeedback: () => {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
  },

  addFeedback: (feedback) => {
    const feed = db.getFeedback();
    const newFeedback = {
      id: `feed-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'Unread',
      resolved: false,
      table: 'Table ' + (Math.floor(Math.random() * 15) + 1), // Mock table association
      ...feedback
    };
    feed.unshift(newFeedback);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feed));
    return newFeedback;
  },

  toggleFeedbackResolved: (id) => {
    const feed = db.getFeedback();
    const index = feed.findIndex(f => f.id === id);
    if (index !== -1) {
      feed[index].resolved = !feed[index].resolved;
      feed[index].status = feed[index].resolved ? 'Resolved' : 'Reviewed';
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feed));
    }
    return feed;
  },

  // QR Management
  getQRCodes: () => {
    return JSON.parse(localStorage.getItem(QR_CODES_KEY) || '[]');
  },

  addQRCode: (name) => {
    const qrCodes = db.getQRCodes();
    const newQR = {
      id: `qr-${Date.now()}`,
      name: name,
      scans: 0,
      redirects: 0,
      feedback: 0,
      code: name.toUpperCase().replace(/\s+/g, '')
    };
    qrCodes.push(newQR);
    localStorage.setItem(QR_CODES_KEY, JSON.stringify(qrCodes));
    return newQR;
  },

  deleteQRCode: (id) => {
    const qrCodes = db.getQRCodes();
    const updated = qrCodes.filter(qr => qr.id !== id);
    localStorage.setItem(QR_CODES_KEY, JSON.stringify(updated));
    return updated;
  },

  // Stats Counters
  getStats: () => {
    const reviews = db.getReviews();
    const feedback = db.getFeedback();
    const scans = parseInt(localStorage.getItem(SCANS_COUNT_KEY) || '739', 10);
    const redirects = parseInt(localStorage.getItem(REDIRECTS_COUNT_KEY) || '516', 10);

    return {
      scans,
      reviewsGenerated: reviews.length + feedback.length, // total attempts
      redirects,
      feedbackCount: feedback.length,
      redirectRate: Math.round((redirects / scans) * 100)
    };
  },

  incrementScans: () => {
    const scans = parseInt(localStorage.getItem(SCANS_COUNT_KEY) || '0', 10);
    localStorage.setItem(SCANS_COUNT_KEY, (scans + 1).toString());
  },

  // Restaurant Settings Config
  getSettings: () => {
    const defaultSettings = {
      restaurantName: 'The Violet Orchid',
      googleReviewUrl: 'https://www.google.com/search?q=sandoz&oq=sandoz&gs_lcrp=EgZjaHJvbWUqDQgAEAAY4wIYsQMYgAQyDQgAEAAY4wIYsQMYgAQyEAgBEC4YxwEYsQMY0QMYgAQyEwgCEC4YrwEYxwEYsQMYgAQYjgUyBwgDEAAYgAQyDQgEEC4YrwEYxwEYgAQyEAgFEC4YrwEYxwEYgAQYjgUyEAgGEC4YrwEYxwEYgAQYjgUyBwgHEAAYgAQyBwgIEAAYgAQyEAgJEC4YrwEYxwEYgAQYjgXSAQgxMjg4ajBqN6gCCLACAfEFCqTYu2YtdVQ&sourceid=chrome&source=chrome.ob&ie=UTF-8#sv=CAESzAEKuAEStQEKd0FKaVQ0dEllVnQ4VkMyQUtJQUE1V2h1REZEWXRpZjNLOGdlVkFQNjNlSHdZUFlMQ0ZkTXpDVVNGVzczWUhHY1lkb3BEcTlTR0p4bl80T3ZxQnVsak9WQlRjNUlfV0YtRHVqWVhyXzI2UElHODg0SkxCX2lXUU5zEhZ3VEpXYXBmQkhORHc0LUVQaFBhTEtRGiJBRHNyOWZSWkNGbFE3eXJCUENCSUpvUlVTUWFPZ3hEVGR3EgQ4MDUxGgEzKgAwADgBQAAYACD548uyAUoCEAI',
      minimumReviewThreshold: 4.0,
      aiWritingStyle: 'Enthusiastic & Warm',
      resendEmail: 'manager@violetorchid.com',
      notificationsEnabled: true
    };
    const stored = localStorage.getItem('reviewflow_settings');
    if (!stored) {
      localStorage.setItem('reviewflow_settings', JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    return JSON.parse(stored);
  },

  saveSettings: (settings) => {
    localStorage.setItem('reviewflow_settings', JSON.stringify(settings));
    return settings;
  },

  // ── Multi-Restaurant Support ──────────────────────────────────────────────

  getRestaurants: () => {
    const stored = localStorage.getItem(RESTAURANTS_KEY);
    if (!stored) {
      localStorage.setItem(RESTAURANTS_KEY, JSON.stringify(DEFAULT_RESTAURANTS));
      return DEFAULT_RESTAURANTS;
    }
    return JSON.parse(stored);
  },

  getActiveRestaurant: () => {
    const restaurants = db.getRestaurants();
    const activeId = localStorage.getItem(ACTIVE_RESTAURANT_KEY);
    if (activeId) {
      const found = restaurants.find(r => r.id === activeId);
      if (found) return found;
    }
    // Default to first restaurant
    return restaurants[0] || null;
  },

  setActiveRestaurant: (restaurantId) => {
    localStorage.setItem(ACTIVE_RESTAURANT_KEY, restaurantId);
  },

  saveRestaurantSettings: (restaurantId, updates) => {
    const restaurants = db.getRestaurants();
    const idx = restaurants.findIndex(r => r.id === restaurantId);
    if (idx !== -1) {
      restaurants[idx] = { ...restaurants[idx], ...updates };
      localStorage.setItem(RESTAURANTS_KEY, JSON.stringify(restaurants));
    }
    return restaurants;
  },

  addRestaurant: (restaurant) => {
    const restaurants = db.getRestaurants();
    const newRestaurant = {
      id: restaurant.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      googleReviewUrl: '',
      notificationEmail: '',
      ...restaurant,
    };
    restaurants.push(newRestaurant);
    localStorage.setItem(RESTAURANTS_KEY, JSON.stringify(restaurants));
    return newRestaurant;
  },
};
