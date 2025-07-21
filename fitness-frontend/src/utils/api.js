// utils/api.js
import axios from 'axios';

// Main API instance with authentication
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 errors and refresh token
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry attempt
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // Update Authorization header for the original request and retry it
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest); // Use the 'api' instance to retry
        } catch (refreshError) {
          // Refresh token invalid or expired, clear storage and redirect to login
          console.log('Token refresh failed, redirecting to login');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userType');
          localStorage.removeItem('userId');
          localStorage.removeItem('memberId');
          localStorage.removeItem('memberID');
          localStorage.removeItem('name');
          localStorage.removeItem('username');
          localStorage.removeItem('isAuthenticated');
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, redirect to login
        console.log('No refresh token, redirecting to login');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    // For other errors or if refresh failed/not applicable, reject the promise
    return Promise.reject(error);
  }
);

// --- NEW: Public API instance for kiosk and other unauthenticated endpoints ---
const publicApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/', // Same base URL
  // No interceptors for publicApi, so it won't attach tokens
});

// Export both instances
export { api, publicApi }; // Named exports
export default api; // Default export (for backward compatibility)