// utils/sessionManager.js

export const switchToMemberSession = () => {
  // Clear current session
  clearCurrentSession();
  
  // Load member session if available
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
    return true;
  }
  return false;
};

export const switchToAdminSession = () => {
  // Clear current session
  clearCurrentSession();
  
  // Load admin session if available
  const adminToken = localStorage.getItem('admin_access_token');
  if (adminToken) {
    localStorage.setItem('access_token', adminToken);
    localStorage.setItem('refreshToken', localStorage.getItem('admin_refreshToken') || '');
    localStorage.setItem('userId', localStorage.getItem('admin_userId') || '');
    localStorage.setItem('name', localStorage.getItem('admin_name') || '');
    localStorage.setItem('username', localStorage.getItem('admin_username') || '');
    localStorage.setItem('userType', 'admin');
    localStorage.setItem('isAuthenticated', 'true');
    return true;
  }
  return false;
};

export const clearCurrentSession = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
  localStorage.removeItem('memberId');
  localStorage.removeItem('name');
  localStorage.removeItem('username');
  localStorage.removeItem('isAuthenticated');
};

export const getAvailableSessions = () => {
  return {
    member: !!localStorage.getItem('member_access_token'),
    admin: !!localStorage.getItem('admin_access_token')
  };
};

export const getCurrentSession = () => {
  return localStorage.getItem('userType');
};
