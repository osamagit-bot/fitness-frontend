// Create this in src/utils/auth.js
export const verifyToken = async (requiredRole = null) => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    
    if (!token || !userJson) return false;
    
    try {
      const user = JSON.parse(userJson);
      
      // If a specific role is required, check it
      if (requiredRole && user.role !== requiredRole) return false;
      
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };