// Environment-aware configuration
const getApiBaseUrl = () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  if (!baseURL) {
    console.warn('VITE_API_BASE_URL not set, using development default');
    return 'http://127.0.0.1:8000/api/';  // Changed back to 8000
  }
  return baseURL.replace(/\/$/, '') + '/';
};

const getWebSocketUrl = () => {
  const wsHost = import.meta.env.VITE_BACKEND_WS_HOST;
  if (!wsHost) {
    return 'ws://localhost:8000';  // Changed back to 8000
  }
  return `ws://${wsHost}`;
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWebSocketUrl();
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Atalan Gym',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
};
