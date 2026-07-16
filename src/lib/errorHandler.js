/**
 * Global Error Handler & Toast Notifications
 * Centralized error handling with user-friendly messages
 */

// Toast notification system
const toastContainer = new Map();

export const Toast = {
  success: (message, duration = 3000) => showToast(message, 'success', duration),
  error: (message, duration = 4000) => showToast(message, 'error', duration),
  warning: (message, duration = 3500) => showToast(message, 'warning', duration),
  info: (message, duration = 3000) => showToast(message, 'info', duration),
};

function showToast(message, type = 'info', duration = 3000) {
  const toastId = Date.now() + Math.random();
  
  // Create toast element
  const toastEl = document.createElement('div');
  toastEl.id = `toast-${toastId}`;
  toastEl.className = `toast toast-${type}`;
  toastEl.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add to DOM
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  document.getElementById('toast-container').appendChild(toastEl);
  toastContainer.set(toastId, toastEl);

  // Auto-remove
  setTimeout(() => {
    toastEl.remove();
    toastContainer.delete(toastId);
  }, duration);

  return toastId;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// API Error Handler with retry logic
export class APIError extends Error {
  constructor(message, status, originalError) {
    super(message);
    this.status = status;
    this.originalError = originalError;
  }

  isNetworkError() {
    return this.status === 0 || this.status === undefined;
  }

  isTimeout() {
    return this.originalError?.code === 'ECONNABORTED';
  }

  isServerError() {
    return this.status >= 500;
  }

  isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

// API Request with timeout and retry
export async function apiCall(
  fn,
  {
    retries = 2,
    timeout = 15000,
    onRetry = null,
    onError = null,
  } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await fn(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        } else {
          Toast.warning(`Retrying... (attempt ${attempt + 1}/${retries})`);
        }

        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
    }
  }

  // Final error handling
  const userMessage = getErrorMessage(lastError);
  
  if (onError) {
    onError(lastError);
  } else {
    Toast.error(userMessage);
  }

  throw new APIError(userMessage, lastError?.status, lastError);
}

function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred';

  // Network errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }

  // No internet
  if (error?.message?.includes('Network') || error?.status === 0) {
    return 'Network error. Please check your internet connection.';
  }

  // 4xx Client Errors
  if (error?.status === 400) {
    return error?.response?.data?.detail || 'Invalid request. Please check your input.';
  }

  if (error?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (error?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error?.status === 422) {
    return 'Please check your input and try again.';
  }

  if (error?.status >= 400 && error?.status < 500) {
    return error?.response?.data?.detail || 'Request failed. Please try again.';
  }

  // 5xx Server Errors
  if (error?.status >= 500) {
    return 'Server error. Our team has been notified. Please try again later.';
  }

  // Fallback
  return error?.response?.data?.detail || error?.message || 'An error occurred. Please try again.';
}

// Loading state management
export function createLoadingManager() {
  const loading = new Map();

  return {
    start(key) {
      loading.set(key, true);
    },
    end(key) {
      loading.delete(key);
    },
    is(key) {
      return loading.has(key);
    },
    any() {
      return loading.size > 0;
    },
    clear() {
      loading.clear();
    },
  };
}

// Form validation
export const formValidation = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? null : 'Invalid email address';
  },

  password: (password) => {
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!/[a-z]/.test(password)) return 'Password must contain lowercase letters';
    if (!/[A-Z]/.test(password)) return 'Password must contain uppercase letters';
    if (!/[0-9]/.test(password)) return 'Password must contain numbers';
    return null;
  },

  phone: (phone) => {
    const regex = /^[\d\s\-\+\(\)]+$/;
    if (!regex.test(phone)) return 'Invalid phone number format';
    if (phone.replace(/\D/g, '').length < 10) return 'Phone number too short';
    return null;
  },

  url: (url) => {
    try {
      new URL(url);
      return null;
    } catch {
      return 'Invalid URL';
    }
  },

  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (value, min, fieldName = 'This field') => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'This field') => {
    if (value && value.length > max) {
      return `${fieldName} must not exceed ${max} characters`;
    }
    return null;
  },
};

// Input sanitization
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove dangerous tags
    .trim();
}

// Local storage helper with expiration
export const storage = {
  set: (key, value, expirationMinutes = null) => {
    const item = {
      value,
      expires: expirationMinutes ? Date.now() + expirationMinutes * 60000 : null,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  get: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { value, expires } = JSON.parse(item);
    if (expires && Date.now() > expires) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  },

  remove: (key) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    localStorage.clear();
  },
};
