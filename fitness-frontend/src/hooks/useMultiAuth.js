import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Multi-session storage keys
const STORAGE_KEYS = {
  admin: {
    token: 'admin_access_token',
    refresh: 'admin_refresh_token',
    userId: 'admin_user_id',
    username: 'admin_username',
    name: 'admin_name',
    isAuth: 'admin_isAuthenticated'
  },
  member: {
    token: 'member_access_token',
    refresh: 'member_refresh_token',
    userId: 'member_user_id',
    username: 'member_username',
    name: 'member_name',
    memberId: 'member_id',
    isAuth: 'member_isAuthenticated'
  }
};

export const useMultiAuth = (requiredRole = null) => {
  const [authState, setAuthState] = useState({
    admin: { isAuthenticated: false, user: null, loading: true },
    member: { isAuthenticated: false, user: null, loading: true }
  });
  const navigate = useNavigate();

  // Check authentication for a specific role
  const checkAuth = async (role) => {
    const keys = STORAGE_KEYS[role];
    const token = localStorage.getItem(keys.token);
    
    if (!token) {
      return { isAuthenticated: false, user: null };
    }

    try {
      const endpoint = 'auth-test/check/';
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = {
        id: localStorage.getItem(keys.userId),
        username: localStorage.getItem(keys.username),
        name: localStorage.getItem(keys.name),
        role: role
      };

      if (role === 'member') {
        user.memberId = localStorage.getItem(keys.memberId);
      }

      return { isAuthenticated: true, user };
    } catch (error) {
      console.error(`${role} auth check failed:`, error);
      clearSession(role);
    }

    return { isAuthenticated: false, user: null };
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const adminAuth = await checkAuth('admin');
      const memberAuth = await checkAuth('member');

      setAuthState({
        admin: { ...adminAuth, loading: false },
        member: { ...memberAuth, loading: false }
      });

      // Redirect if required role is not authenticated
      if (requiredRole && !adminAuth.isAuthenticated && !memberAuth.isAuthenticated) {
        navigate('/login');
      } else if (requiredRole === 'admin' && !adminAuth.isAuthenticated) {
        navigate('/login');
      } else if (requiredRole === 'member' && !memberAuth.isAuthenticated) {
        navigate('/login');
      }
    };

    initAuth();
  }, [requiredRole, navigate]);

  // Login function
  const login = async (credentials, role) => {
    try {
      const endpoint = role === 'admin' ? 'admin-dashboard/login/' : 'members/login/';
      const response = await api.post(endpoint, credentials);

      const keys = STORAGE_KEYS[role];
      
      // Store session data with role-specific keys
      localStorage.setItem(keys.token, response.data.access_token || response.data.token);
      localStorage.setItem(keys.refresh, response.data.refresh);
      localStorage.setItem(keys.userId, response.data.user_id);
      localStorage.setItem(keys.username, response.data.username || credentials.username);
      localStorage.setItem(keys.name, response.data.name || credentials.username);
      localStorage.setItem(keys.isAuth, 'true');

      if (role === 'member') {
        localStorage.setItem(keys.memberId, response.data.member_id || response.data.athlete_id);
      }

      // Update auth state
      const user = {
        id: response.data.user_id,
        username: response.data.username || credentials.username,
        name: response.data.name || credentials.username,
        role: role
      };

      if (role === 'member') {
        user.memberId = response.data.member_id || response.data.athlete_id;
      }

      setAuthState(prev => ({
        ...prev,
        [role]: { isAuthenticated: true, user, loading: false }
      }));

      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Logout function
  const logout = (role) => {
    clearSession(role);
    setAuthState(prev => ({
      ...prev,
      [role]: { isAuthenticated: false, user: null, loading: false }
    }));
    
    // Redirect to login if logging out the required role
    if (requiredRole === role) {
      navigate('/login');
    }
  };

  // Clear session data
  const clearSession = (role) => {
    const keys = STORAGE_KEYS[role];
    Object.values(keys).forEach(key => localStorage.removeItem(key));
  };

  // Switch between sessions
  const switchSession = (role) => {
    if (authState[role].isAuthenticated) {
      const redirectPath = role === 'admin' ? '/admin/dashboard' : '/member-dashboard';
      navigate(redirectPath);
    } else {
      navigate('/login');
    }
  };

  // Get current active session based on current route
  const getCurrentSession = () => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/member-dashboard')) return 'member';
    return null;
  };

  return {
    authState,
    login,
    logout,
    switchSession,
    getCurrentSession,
    isLoading: authState.admin.loading || authState.member.loading,
    hasAdminSession: authState.admin.isAuthenticated,
    hasMemberSession: authState.member.isAuthenticated,
    currentUser: authState[getCurrentSession()]?.user || null
  };
};

export default useMultiAuth;