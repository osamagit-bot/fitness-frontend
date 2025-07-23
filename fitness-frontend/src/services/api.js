// utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/',
  timeout: 10000, // 10 second timeout
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

// Response interceptor - prevent redirects during critical operations
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors gracefully (when backend is down)
    if (!error.response) {
      console.warn('🔌 Backend appears to be offline. Some features may use cached data.');
      return Promise.reject(error);
    }

    // Check if it's a 401 error and not a retry attempt
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const refreshUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'}/token/refresh/`.replace('/api//', '/api/');
          const response = await axios.post(refreshUrl, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.log('🚨 Token refresh failed:', refreshError.response?.data);
          
          // Check if user was deleted
          if (refreshError.response?.data?.code === 'user_deleted') {
            console.log('🚨 User account deleted - forcing logout');
            
            const currentUserType = localStorage.getItem('userType');
            
            // Only show alert and logout if current user is a member
            if (currentUserType === 'member') {
              alert('Your account has been deleted. You will be redirected to login.');
              
              // Clear all auth data for deleted member
              const keysToRemove = [
                'access_token', 'refreshToken', 'userType', 'userId', 
                'memberId', 'memberID', 'name', 'username', 'isAuthenticated'
              ];
              keysToRemove.forEach(key => localStorage.removeItem(key));
              
              // Redirect member to login
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            } else {
              console.log('🔧 Admin session - member account was deleted, no action needed');
              // Don't clear admin session or redirect
            }
            
            return Promise.reject(refreshError);
          }
          
          // For other refresh errors, clear session and redirect
          const keysToRemove = [
            'access_token', 'refreshToken', 'userType', 'userId', 
            'memberId', 'memberID', 'name', 'username', 'isAuthenticated'
          ];
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Force redirect to login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
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

    return Promise.reject(error);
  }
);

export default api;






