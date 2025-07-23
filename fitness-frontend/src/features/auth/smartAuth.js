// utils/smartAuth.js - Production-ready with development compatibility
import api from '../../services/api';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Environment-aware configuration
const AUTH_CONFIG = {
  development: {
    allowDualSessions: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    strictValidation: false,
    enableAuditLog: false,
  },
  production: {
    allowDualSessions: false,
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
    strictValidation: true,
    enableAuditLog: true,
  }
};

const config = AUTH_CONFIG[process.env.NODE_ENV] || AUTH_CONFIG.development;

// Enhanced authentication with role support
export const authenticateUser = async (credentials, loginType) => {
  try {
    console.log(`🔐 ${isProduction ? 'Production' : 'Development'} authentication starting...`);
    
    let response;
    if (loginType === 'member') {
      response = await api.post('members/login/', credentials);
    } else if (loginType === 'admin') {
      response = await api.post('admin-dashboard/login/', credentials);
    }

    // Get user roles (production feature)
    let userRoles = [loginType]; // Default to single role
    if (config.strictValidation) {
      try {
        const rolesResponse = await api.get('auth/user-roles/', {
          headers: { Authorization: `Bearer ${response.data.token || response.data.access_token}` }
        });
        userRoles = rolesResponse.data.roles || [loginType];
        console.log('🔍 User roles from backend:', userRoles);
      } catch (error) {
        console.log('⚠️ Could not fetch user roles, using default');
      }
    }

    const sessionData = {
      token: response.data.token || response.data.access_token,
      refresh: response.data.refresh,
      userType: loginType,
      userRoles,
      userId: response.data.user_id,
      memberId: response.data.member_id,
      name: response.data.name,
      username: response.data.username,
      loginTime: Date.now(),
    };

    await storeSession(sessionData);
    
    if (config.enableAuditLog) {
      await logAuthEvent('login', loginType, sessionData.userId);
    }

    return { success: true, sessionData };
  } catch (error) {
    console.error('🚨 Authentication failed:', error);
    
    // Check if it's a maintenance mode error
    if (error.response?.status === 503 && error.response?.data?.maintenance_mode) {
      return { 
        success: false, 
        error: error.response.data.user_message || 'Sorry! The system is under maintenance mode. We will be back online shortly!',
        maintenanceMode: true,
        maintenanceMessage: error.response.data.user_message
      };
    }
    
    // Pass through the error for specific handling in the UI
    return { 
      success: false, 
      error: error.response?.data?.detail || error.message,
      status: error.response?.status,
      response: error.response
    };
  }
};

// Smart session storage
export const storeSession = async (sessionData) => {
  const { userType } = sessionData;
  
  if (config.allowDualSessions) {
    // Development: Store both namespaced and current session
    console.log('💾 Development mode: Storing dual sessions');
    
    // Store namespaced session
    Object.keys(sessionData).forEach(key => {
      if (sessionData[key]) {
        localStorage.setItem(`${userType}_${key}`, sessionData[key]);
      }
    });
  }
  
  // Always store current active session
  localStorage.setItem('access_token', sessionData.token);
  localStorage.setItem('refreshToken', sessionData.refresh || '');
  localStorage.setItem('userType', sessionData.userType);
  localStorage.setItem('userRoles', JSON.stringify(sessionData.userRoles));
  localStorage.setItem('userId', sessionData.userId || '');
  localStorage.setItem('memberId', sessionData.memberId || '');
  localStorage.setItem('name', sessionData.name || '');
  localStorage.setItem('username', sessionData.username || '');
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('sessionStart', sessionData.loginTime.toString());
  
  console.log('✅ Session stored successfully');
};

// Enhanced session validation with operation context
export const validateSession = async (operationContext = null) => {
  console.log(`🔍 ${isProduction ? 'Production' : 'Development'} session validation...`);
  
  const token = localStorage.getItem('access_token');
  const sessionStart = localStorage.getItem('sessionStart');
  const userType = localStorage.getItem('userType');
  
  if (!token || !sessionStart || !userType) {
    console.log('❌ Missing session data');
    
    // Don't auto-clear during critical operations
    if (operationContext !== 'delete') {
      return { isValid: false, reason: 'missing_data' };
    } else {
      return { isValid: false, reason: 'missing_data', skipClear: true };
    }
  }
  
  // Check session timeout
  const sessionAge = Date.now() - parseInt(sessionStart);
  if (sessionAge > config.sessionTimeout) {
    console.log(`❌ Session expired (${Math.round(sessionAge / 60000)} minutes old)`);
    
    if (operationContext !== 'delete') {
      await clearAllSessions();
    }
    return { isValid: false, reason: 'expired', skipClear: operationContext === 'delete' };
  }
  
  // Development: Try to restore session if needed
  if (config.allowDualSessions) {
    const currentPath = window.location.pathname;
    
    if (currentPath.startsWith('/member-dashboard') && userType !== 'member') {
      if (await restoreSession('member')) {
        console.log('🔄 Auto-restored member session');
        return { isValid: true, restored: true };
      }
    } else if (currentPath.startsWith('/admin') && userType !== 'admin') {
      if (await restoreSession('admin')) {
        console.log('🔄 Auto-restored admin session');
        return { isValid: true, restored: true };
      }
    }
  }
  
  // Validate token with backend
  try {
    await api.get('auth-test/check/');
    console.log('✅ Token validation successful');
    return { isValid: true };
  } catch (error) {
    console.log('❌ Token validation failed:', error.response?.status);
    
    if (error.response?.status === 401) {
      return { isValid: false, reason: 'token_refresh_needed', skipClear: operationContext === 'delete' };
    }
    
    return { isValid: false, reason: 'invalid_token', skipClear: operationContext === 'delete' };
  }
};

// Smart session restoration (development feature)
export const restoreSession = async (sessionType) => {
  if (!config.allowDualSessions) {
    console.log('🚫 Session restoration disabled in production');
    return false;
  }
  
  const storedToken = localStorage.getItem(`${sessionType}_token`);
  if (!storedToken) {
    console.log(`❌ No stored ${sessionType} session found`);
    return false;
  }
  
  console.log(`🔄 Restoring ${sessionType} session...`);
  
  // Restore all session data
  const sessionKeys = ['token', 'refresh', 'userType', 'userId', 'memberId', 'name', 'username', 'loginTime'];
  
  sessionKeys.forEach(key => {
    const value = localStorage.getItem(`${sessionType}_${key}`);
    if (value) {
      if (key === 'token') {
        localStorage.setItem('access_token', value);
      } else if (key === 'refresh') {
        localStorage.setItem('refreshToken', value);
      } else {
        localStorage.setItem(key, value);
      }
    }
  });
  
  localStorage.setItem('isAuthenticated', 'true');
  console.log(`✅ ${sessionType} session restored`);
  return true;
};

// Role-based access control (production feature)
export const hasRole = (requiredRole) => {
  const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
  return userRoles.includes(requiredRole);
};

export const switchRole = async (newRole) => {
  if (!hasRole(newRole)) {
    throw new Error(`User doesn't have ${newRole} role`);
  }
  
  const currentRole = localStorage.getItem('userType');
  
  if (config.enableAuditLog) {
    await logAuthEvent('role_switch', newRole, localStorage.getItem('userId'), {
      from: currentRole,
      to: newRole
    });
  }
  
  localStorage.setItem('userType', newRole);
  console.log(`🔄 Switched from ${currentRole} to ${newRole}`);
  
  return true;
};

// Session management
export const clearAllSessions = async () => {
  console.log('🧹 Clearing all sessions...');
  
  if (config.enableAuditLog) {
    await logAuthEvent('logout', localStorage.getItem('userType'), localStorage.getItem('userId'));
  }
  
  // Clear current session
  const currentSessionKeys = [
    'access_token', 'refreshToken', 'userType', 'userRoles', 
    'userId', 'memberId', 'name', 'username', 'isAuthenticated', 'sessionStart'
  ];
  
  currentSessionKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear namespaced sessions (development)
  if (config.allowDualSessions) {
    ['member', 'admin'].forEach(type => {
      ['token', 'refresh', 'userType', 'userId', 'memberId', 'name', 'username', 'loginTime'].forEach(key => {
        localStorage.removeItem(`${type}_${key}`);
      });
    });
  }
  
  console.log('✅ All sessions cleared');
};

// Audit logging (production feature)
export const logAuthEvent = async (event, userType, userId, metadata = {}) => {
  if (!config.enableAuditLog) return;
  
  try {
    await api.post('audit/auth-events/', {
      event,
      userType,
      userId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metadata
    });
  } catch (error) {
    console.warn('⚠️ Failed to log auth event:', error);
  }
};

// Get available sessions (development feature)
export const getAvailableSessions = () => {
  if (!config.allowDualSessions) {
    return { [localStorage.getItem('userType')]: true };
  }
  
  return {
    member: !!localStorage.getItem('member_token'),
    admin: !!localStorage.getItem('admin_token')
  };
};

// Environment info
export const getAuthEnvironment = () => ({
  environment: process.env.NODE_ENV,
  config,
  features: {
    dualSessions: config.allowDualSessions,
    auditLogging: config.enableAuditLog,
    strictValidation: config.strictValidation,
    sessionTimeout: `${config.sessionTimeout / 60000} minutes`
  }
});

export default {
  authenticateUser,
  validateSession,
  restoreSession,
  hasRole,
  switchRole,
  clearAllSessions,
  getAvailableSessions,
  getAuthEnvironment
};

