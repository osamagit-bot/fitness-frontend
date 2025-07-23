import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './app.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { APP_CONFIG } from './Config';
import { UserProvider } from './contexts/UserContext';
import './index.css';

// Initialize app
console.log(`🚀 Starting ${APP_CONFIG.name} v${APP_CONFIG.version} in ${APP_CONFIG.environment} mode`);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <UserProvider>
          <MantineProvider withGlobalStyles withNormalizeCSS>
            <App />
            <ToastContainer 
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={APP_CONFIG.environment === 'production' ? 'light' : 'colored'}
            />
          </MantineProvider>
        </UserProvider>
      </BrowserRouter>
    </ErrorBoundary>
 </StrictMode>
);

