// utils/productionAuth.js - Production-ready approach

// Option 1: Role-based authentication
export const checkUserRoles = async () => {
  try {
    const response = await api.get('auth/user-roles/');
    return response.data.roles; // ['member', 'admin']
  } catch (error) {
    return [];
  }
};

export const switchRole = async (newRole) => {
  const userRoles = await checkUserRoles();
  
  if (!userRoles.includes(newRole)) {
    throw new Error(`User doesn't have ${newRole} role`);
  }
  
  // Update current role
  localStorage.setItem('activeRole', newRole);
  
  // Log role switch for audit
  await api.post('audit/role-switch/', {
    fromRole: localStorage.getItem('activeRole'),
    toRole: newRole,
    timestamp: new Date().toISOString()
  });
  
  return true;
};

// Option 2: Secure session management
export const createSecureSession = (sessionData) => {
  // Encrypt sensitive data
  const encryptedData = btoa(JSON.stringify(sessionData));
  
  // Set shorter expiration
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 2); // 2 hours
  
  localStorage.setItem('session', encryptedData);
  localStorage.setItem('sessionExpiry', expiration.toISOString());
};

export const validateSession = () => {
  const expiry = localStorage.getItem('sessionExpiry');
  if (!expiry || new Date() > new Date(expiry)) {
    clearSession();
    return false;
  }
  return true;
};

export const clearSession = () => {
  localStorage.removeItem('session');
  localStorage.removeItem('sessionExpiry');
  localStorage.removeItem('activeRole');
};

// Option 3: Force logout on role switch
export const secureRoleSwitch = async (newRole) => {
  // Log out current session
  await api.post('auth/logout/');
  clearSession();
  
  // Redirect to login with role parameter
  window.location.href = `/login?role=${newRole}`;
};
