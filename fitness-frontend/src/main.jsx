import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './app.css';
import App from './App.jsx';
import { UserProvider } from './contexts/UserContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* ✅ Only one here */}
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
          />
        </MantineProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>
);
