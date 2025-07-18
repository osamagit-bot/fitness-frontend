// hooks/useSmartAuth.js - Smart authentication hook
import { useState, useEffect } from 'react';
import smartAuth from '../features/auth/smartAuth';

export const useSmartAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userType: null,
    userRoles: [],
    loading: true,
    environment: process.env.NODE_ENV
  });

  useEffect(() => {
    console.log(`🚀 Smart auth starting in ${process.env.NODE_ENV} mode...`);
    
    const validateAuth = async () => {
      try {
        const validation = await smartAuth.validateSession();
        
        if (validation.isValid) {
          const userType = localStorage.getItem('userType');
          const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
          
          setAuthState({
            isAuthenticated: true,
            userType,
            userRoles,
            loading: false,
            environment: process.env.NODE_ENV,
            restored: validation.restored || false
          });
          
          console.log('✅ Smart auth validation successful');
        } else {
          console.log('❌ Smart auth validation failed:', validation.reason);
          setAuthState({
            isAuthenticated: false,
            userType: null,
            userRoles: [],
            loading: false,
            environment: process.env.NODE_ENV,
            reason: validation.reason
          });
        }
      } catch (error) {
        console.error('🚨 Smart auth error:', error);
        setAuthState({
          isAuthenticated: false,
          userType: null,
          userRoles: [],
          loading: false,
          environment: process.env.NODE_ENV,
          error: error.message
        });
      }
    };

    validateAuth();
  }, []);

  const hasRole = (role) => {
    return smartAuth.hasRole(role);
  };

  const switchRole = async (newRole) => {
    try {
      await smartAuth.switchRole(newRole);
      setAuthState(prev => ({
        ...prev,
        userType: newRole
      }));
      return true;
    } catch (error) {
      console.error('Failed to switch role:', error);
      return false;
    }
  };

  const logout = async () => {
    await smartAuth.clearAllSessions();
    setAuthState({
      isAuthenticated: false,
      userType: null,
      userRoles: [],
      loading: false,
      environment: process.env.NODE_ENV
    });
  };

  console.log('🚀 Smart auth state:', authState);
  
  return {
    ...authState,
    hasRole,
    switchRole,
    logout,
    availableSessions: smartAuth.getAvailableSessions(),
    authEnvironment: smartAuth.getAuthEnvironment()
  };
};
