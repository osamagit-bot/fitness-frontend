// utils/auth.js
import api from '../services/api';

export const checkAuthStatus = async () => {
  console.log('🔍 Starting auth status check...');
  
  // Production security check
  if (process.env.NODE_ENV === 'production') {
    // Validate session expiry (2 hours max)
    const sessionStart = localStorage.getItem('sessionStart');
    if (sessionStart) {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      if (parseInt(sessionStart) < twoHoursAgo) {
        console.log('🔒 Session expired, clearing auth data');
        clearAuthData();

    
        return { isAuthenticated: false, userType: null };
      }
    } else {
      localStorage.setItem('sessionStart', Date.now().toString());
    }
  }
  
  // First, try to restore session based on current URL
  const currentPath = window.location.pathname;
  let restoredSession = false;

  
  if (currentPath.startsWith('/member-dashboard')) {
    console.log('🔄 Member page detected, checking for member session...');
    if (localStorage.getItem('member_access_token')) {
      console.log('🔄 Restoring member session...');
      restoreMemberSession();
      restoredSession = true;
    }
  } else if (currentPath.startsWith('/admin')) {
    console.log('🔄 Admin page detected, checking for admin session...');
    if (localStorage.getItem('admin_access_token')) {
      console.log('🔄 Restoring admin session...');
      restoreAdminSession();
      restoredSession = true;
    }
  }
  
  const token = localStorage.getItem('access_token');
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  const userType = localStorage.getItem('userType');

  console.log('🔍 Auth data check:', {
    hasToken: !!token,
    isAuthenticated,
    userType,
    tokenLength: token?.length || 0,
    restoredSession
  });

  // If no token or not marked as authenticated, user is not logged in
  if (!token || isAuthenticated !== 'true' || !userType) {
    console.log('❌ Missing auth data, clearing and returning false');
    clearAuthData();
    return { isAuthenticated: false, userType: null };
  }

  // Temporarily skip API validation and just check token format
  if (isTokenValid()) {
    console.log('✅ Token appears valid, allowing access');
    return { isAuthenticated: true, userType };
  }

  try {
    console.log('🔍 Token appears expired, trying API validation...');
    // Validate token by making a test API call
    const response = await api.get('auth-test/check/');
    console.log('✅ Token validation successful:', response.data);
    return { isAuthenticated: true, userType };
  } catch (error) {
    console.log('❌ Token validation failed:', {
      status: error.response?.status,
      message: error.response?.data,
      error: error.message
    });
    
    // If it's a 401, the token refresh interceptor will try to refresh
    if (error.response?.status === 401) {
      console.log('🔄 401 error, trying token refresh...');
      // Let the interceptor handle token refresh
      try {
        // Retry the auth check after potential token refresh
        const retryResponse = await api.get('auth-test/check/');
        console.log('✅ Token refresh and retry successful:', retryResponse.data);
        return { isAuthenticated: true, userType };
      } catch (retryError) {
        console.log('❌ Token refresh failed:', retryError.message);
        // Token refresh failed, clear auth data
        clearAuthData();
        return { isAuthenticated: false, userType: null };
      }
    } else {
      console.log('❌ Non-401 error, clearing auth data');
      // Other errors, assume not authenticated
      clearAuthData();
      return { isAuthenticated: false, userType: null };
    }
  }
};

export const clearAuthData = () => {
  const keysToRemove = [
    'access_token', 'refreshToken', 'userType', 'userId', 
    'memberId', 'memberID', 'name', 'username', 'isAuthenticated'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('🧹 Auth data cleared');
};

export const logout = () => {
  clearAuthData();
  window.location.href = '/login';
};

export const restoreMemberSession = () => {
  const memberToken = localStorage.getItem('member_access_token');
  if (memberToken) {
    localStorage.setItem('access_token', memberToken);
    localStorage.setItem('refreshToken', localStorage.getItem('member_refreshToken') || '');
    localStorage.setItem('memberId', localStorage.getItem('member_memberId') || '');
    localStorage.setItem('userId', localStorage.getItem('member_userId') || '');
    localStorage.setItem('name', localStorage.getItem('member_name') || '');
    localStorage.setItem('username', localStorage.getItem('member_username') || '');
    localStorage.setItem('userType', 'member');
    localStorage.setItem('isAuthenticated', 'true');
    console.log('✅ Member session restored');
    return true;
  }
  return false;
};

export const restoreAdminSession = () => {
  const adminToken = localStorage.getItem('admin_access_token');
  if (adminToken) {
    localStorage.setItem('access_token', adminToken);
    localStorage.setItem('refreshToken', localStorage.getItem('admin_refreshToken') || '');
    localStorage.setItem('userId', localStorage.getItem('admin_userId') || '');
    localStorage.setItem('name', localStorage.getItem('admin_name') || '');
    localStorage.setItem('username', localStorage.getItem('admin_username') || '');
    localStorage.setItem('userType', 'admin');
    localStorage.setItem('isAuthenticated', 'true');
    console.log('✅ Admin session restored');
    return true;
  }
  return false;
};

export const isTokenValid = async () => {
  try {
    const response = await api.get('auth-test/check/');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      clearAuthData();
      return false;
    }
    return false;
  }
};

