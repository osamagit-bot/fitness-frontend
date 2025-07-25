// utils/api.js - Production-ready with dev/prod compatibility
import axios from 'axios';

// Environment-aware base URL
const getBaseURL = () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  if (!baseURL) {
    console.warn('VITE_API_BASE_URL not set, falling back to localhost');
    return import.meta.env.PROD ? 'https://your-production-api.com/api/' : 'http://127.0.0.1:8000/api/';
  }
  return baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
};

// Main API instance with authentication (for regular frontend components)
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 second timeout
  // Do not set Content-Type globally; set per-request as needed
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add request ID for tracking
  config.metadata = { startTime: new Date() };
  
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Only log in development and if explicitly enabled
    if (import.meta.env.VITE_ENVIRONMENT === 'development' && import.meta.env.VITE_LOG_API === 'true') {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`[API][${response.config.method?.toUpperCase()}] ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network connection failed. Please check your internet connection.'));
    }

    // Handle 401 errors with token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(`${getBaseURL()}token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.response?.data);
          
          // Handle user deletion
          if (refreshError.response?.data?.code === 'user_deleted') {
            console.log('User account deleted - forcing logout');
            const currentUserType = localStorage.getItem('userType');
            
            // Clear all auth data
            const keysToRemove = [
              'access_token', 'refreshToken', 'userType', 'userId', 
              'memberId', 'memberID', 'name', 'username', 'isAuthenticated'
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Redirect based on user type
            const redirectPath = currentUserType === 'admin' ? '/admin-login' : '/login';
            if (!window.location.pathname.includes('login')) {
              window.location.href = redirectPath;
            }
            return Promise.reject(new Error('Account has been deleted'));
          }
          
          // Only redirect for token refresh failures, not permission errors
          if (refreshError.response?.status === 401) {
            // Clear session and redirect for auth failures
            const currentUserType = localStorage.getItem('userType');
            const keysToRemove = [
              'access_token', 'refreshToken', 'userType', 'userId', 
              'memberId', 'memberID', 'name', 'username', 'isAuthenticated'
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Redirect based on user type
            const redirectPath = currentUserType === 'admin' ? '/admin-login' : '/login';
            if (!window.location.pathname.includes('login')) {
              window.location.href = redirectPath;
            }
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - redirect to login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    // Handle 403 errors - don't redirect, just log and pass through
    if (error.response.status === 403) {
      console.warn('⚠️ Access forbidden for:', originalRequest.url);
      // Don't redirect for 403 - these are permission errors, not auth failures
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Public API instance for kiosk and unauthenticated endpoints
const publicApi = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  // Do not set Content-Type globally; set per-request as needed
});

// Public API response interceptor (no auth handling)
publicApi.interceptors.response.use(
  (response) => {
    if (import.meta.env.VITE_ENVIRONMENT === 'development') {
      console.log(`Public API Response: ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (!error.response) {
      console.error('Public API Network error:', error.message);
      return Promise.reject(new Error('Network connection failed'));
    }
    return Promise.reject(error);
  }
);

// Export both instances
export { api, publicApi };
export default api; // Default export (for backward compatibility)






