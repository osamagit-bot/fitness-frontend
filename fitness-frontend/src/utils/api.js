// utils/api.js - Fixed with redirect loop prevention
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

// Prevent multiple simultaneous operations
let isRedirecting = false;
let refreshingToken = false;
let pendingRequests = [];

// Main API instance
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Determine which token to use based on current route
  const currentPath = window.location.pathname;
  let token;
  
  if (currentPath.startsWith('/admin')) {
    token = localStorage.getItem('admin_access_token');
  } else if (currentPath.startsWith('/member-dashboard')) {
    token = localStorage.getItem('member_access_token');
  } else {
    // Fallback to either token if available
    token = localStorage.getItem('admin_access_token') || localStorage.getItem('member_access_token');
  }
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  config.metadata = { startTime: new Date() };
  // console.log('API Request', { url: config.url, method: config.method });
  
  return config;
}, (error) => {
  // console.log('Request interceptor error', error);
  return Promise.reject(error);
});

// Enhanced response interceptor with circuit breaker
api.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime;
    // console.log('API Success', { url: response.config.url, status: response.status, duration: `${duration}ms` });
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // console.log('API Error', { url: originalRequest?.url, status: error.response?.status, message: error.message });

    // Handle network errors
    if (!error.response) {
      // console.log('Network error detected');
      return Promise.reject(new Error('Network connection failed. Please check your internet connection.'));
    }

    // Handle 401 errors with enhanced logic
    if (error.response.status === 401 && !originalRequest._retry) {
      // console.log('401 Unauthorized - attempting token refresh');

      originalRequest._retry = true;

      // Prevent multiple simultaneous token refresh attempts
      if (refreshingToken) {
        // console.log('Token refresh already in progress, queuing request');
        
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject, config: originalRequest });
        });
      }

      refreshingToken = true;
      
      // Get the appropriate refresh token based on current route
      const currentPath = window.location.pathname;
      let refreshToken;
      
      if (currentPath.startsWith('/admin')) {
        refreshToken = localStorage.getItem('admin_refresh_token');
      } else if (currentPath.startsWith('/member-dashboard')) {
        refreshToken = localStorage.getItem('member_refresh_token');
      } else {
        refreshToken = localStorage.getItem('admin_refresh_token') || localStorage.getItem('member_refresh_token');
      }

      if (refreshToken) {
        try {
          // console.log('Attempting token refresh');
          
          const response = await axios.post(`${getBaseURL()}token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = response.data.access;
          
          // Store the new token in the correct role-specific key
          if (currentPath.startsWith('/admin')) {
            localStorage.setItem('admin_access_token', newAccessToken);
          } else if (currentPath.startsWith('/member-dashboard')) {
            localStorage.setItem('member_access_token', newAccessToken);
          } else {
            // Fallback - store in both if unsure
            localStorage.setItem('admin_access_token', newAccessToken);
            localStorage.setItem('member_access_token', newAccessToken);
          }
          
          // console.log('Token refresh successful');
          
          // Update original request and retry
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Process any pending requests
          pendingRequests.forEach(({ resolve, config }) => {
            config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            resolve(api(config));
          });
          pendingRequests = [];
          
          refreshingToken = false;
          // Token refresh successful
          
          return api(originalRequest);
          
        } catch (refreshError) {
          refreshingToken = false;
          pendingRequests = [];
          
          // console.log('Token refresh failed', { status: refreshError.response?.status, error: refreshError.response?.data });
          
          // Handle specific refresh errors
          if (refreshError.response?.data?.code === 'user_deleted') {
            // console.log('User account deleted - forcing logout');
            await handleAuthError('user_deleted');
            return Promise.reject(new Error('Account has been deleted'));
          }
          
          // Handle other refresh failures
          await handleAuthError('refresh_failed');
          return Promise.reject(refreshError);
        }
      } else {
        refreshingToken = false;
        // console.log('No refresh token available');
        await handleAuthError('no_refresh_token');
      }
    }

    return Promise.reject(error);
  }
);

// Centralized auth error handling
async function handleAuthError(reason) {
  // console.log('Handling auth error', { reason });
  
  // Don't redirect if already on login page or already redirecting
  if (window.location.pathname.includes('/login') || isRedirecting) {
    // console.log('Skipping redirect - already on login or redirecting');
    return;
  }
  
  // Clear authentication data
  const keysToRemove = [
    'access_token', 'refreshToken', 'userType', 'userId', 
    'memberId', 'name', 'username', 'isAuthenticated', 'sessionStart'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Safe redirect with circuit breaker
  isRedirecting = true;
  
  setTimeout(() => {
    isRedirecting = false;
  }, 3000);
  
  const currentUserType = localStorage.getItem('userType');
  const redirectPath = currentUserType === 'admin' ? '/admin-login' : '/login';
  
  // console.log('Redirecting to login', { path: redirectPath });
  
  // Use replace to avoid adding to history
  window.location.replace(redirectPath);
}

// Public API instance
const publicApi = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

publicApi.interceptors.response.use(
  (response) => {
    // console.log('Public API Success', { url: response.config.url });
    return response;
  },
  (error) => {
    // console.log('Public API Error', { url: error.config?.url, status: error.response?.status });
    
    if (!error.response) {
      return Promise.reject(new Error('Network connection failed'));
    }
    return Promise.reject(error);
  }
);

export { api, publicApi };
export default api;