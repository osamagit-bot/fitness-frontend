// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { checkAuthStatus } from '../../utils/auth';

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userType: null,
    loading: true
  });

  useEffect(() => {
    console.log('🚀 useAuth hook starting authentication validation...');
    
    const validateAuth = async () => {
      try {
        const { isAuthenticated, userType } = await checkAuthStatus();
        console.log('🚀 useAuth validation result:', { isAuthenticated, userType });
        
        setAuthState({
          isAuthenticated,
          userType,
          loading: false
        });
      } catch (error) {
        console.error('🚀 useAuth validation error:', error);
        setAuthState({
          isAuthenticated: false,
          userType: null,
          loading: false
        });
      }
    };

    validateAuth();
  }, []);

  console.log('🚀 useAuth current state:', authState);
  return authState;
};
