import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSmartAuth } from '../features/auth/useSmartAuth';

// Create the context
const UserContext = createContext();

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// UserProvider component
export const UserProvider = ({ children }) => {
  const { isAuthenticated, userType, loading } = useSmartAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        // Fallback: construct user object from individual localStorage items
        const memberId = localStorage.getItem('memberId') || localStorage.getItem('memberID');
        const name = localStorage.getItem('name');
        const username = localStorage.getItem('username');
        const userType = localStorage.getItem('userType');
        
        if (memberId) {
          const fallbackUser = {
            athlete_id: memberId,
            name: name,
            username: username,
            userType: userType
          };
          setUser(fallbackUser);
        }
      }
    } else {
      setUser(null);
    }
  }, [isAuthenticated]);

  const value = {
    user,
    setUser,
    isAuthenticated,
    userType,
    loading
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
