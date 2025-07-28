import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../LoadingScreen';

const AuthGuard = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const tokenKey = requiredRole === 'admin' ? 'admin_access_token' : 'member_access_token';
      const isAuthKey = requiredRole === 'admin' ? 'admin_isAuthenticated' : 'member_isAuthenticated';
      
      const token = localStorage.getItem(tokenKey);
      const authStatus = localStorage.getItem(isAuthKey);
      
      if (token && authStatus === 'true') {
        setIsAuthenticated(true);
      } else {
        navigate('/login');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRole, navigate]);

  if (isLoading) {
    return <LoadingScreen message={`Verifying ${requiredRole} access...`} />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  return children;
};

export default AuthGuard;