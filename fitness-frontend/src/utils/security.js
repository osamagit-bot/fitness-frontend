// Production security utilities
import { APP_CONFIG } from '../Config';

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Secure storage with encryption (basic implementation)
export const secureStorage = {
  setItem: (key, value) => {
    try {
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: APP_CONFIG.version
      });
      
      // Basic encoding (in production, use proper encryption)
      const encoded = btoa(serialized);
      localStorage.setItem(key, encoded);
    } catch (error) {
      console.error('Secure storage set error:', error);
    }
  },
  
  getItem: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const decoded = atob(item);
      const parsed = JSON.parse(decoded);
      
      // Check if data is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      console.error('Secure storage get error:', error);
      localStorage.removeItem(key);
      return null;
    }
  },
  
  removeItem: (key) => {
    localStorage.removeItem(key);
  }
};

// Rate limiting for API calls
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove old requests
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    return true;
  }
}

export const apiRateLimiter = new RateLimiter();

// CSRF token handling
export const getCSRFToken = () => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
};

// Validate file uploads
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  } = options;
  
  const errors = [];
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Environment-aware logging
export const secureLog = {
  info: (message, data = {}) => {
    if (APP_CONFIG.enableLogging) {
      console.log(`[${APP_CONFIG.name}] ${message}`, data);
    }
  },
  
  warn: (message, data = {}) => {
    if (APP_CONFIG.enableLogging) {
      console.warn(`[${APP_CONFIG.name}] ${message}`, data);
    }
  },
  
  error: (message, error = {}) => {
    console.error(`[${APP_CONFIG.name}] ${message}`, error);
    
    // In production, send to error reporting service
    if (APP_CONFIG.environment === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: { message } });
    }
  }
};