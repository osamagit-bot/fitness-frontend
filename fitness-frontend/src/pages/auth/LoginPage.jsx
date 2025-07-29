import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { publicApi } from '../../utils/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  
  const navigate = useNavigate();
  
  // Check maintenance mode on component mount
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await publicApi.get('/public/maintenance-mode/');
        const isMaintenanceActive = response.data.enabled || false;
        console.log('🔧 Maintenance mode response:', response.data);
        console.log('🔧 Setting maintenance mode to:', isMaintenanceActive);
        setMaintenanceMode(isMaintenanceActive);
        
        // Set admin as default role if maintenance is active
        if (isMaintenanceActive) {
          setFormData(prev => ({ ...prev, role: 'admin' }));
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        setMaintenanceMode(false);
      } finally {
        setCheckingMaintenance(false);
      }
    };
    
    checkMaintenanceMode();
  }, []);
  


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔧 Maintenance mode:', maintenanceMode);
    console.log('👤 Role:', formData.role);
    
    // Block member login if maintenance mode is active
    if (maintenanceMode && formData.role === 'member') {
      console.log('🚫 Blocking member login - maintenance mode active');
      setError('System is under maintenance. Member access is temporarily disabled.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const endpoint = formData.role === 'admin' ? 'admin-dashboard/login/' : 'members/login/';
      
      console.log('🔐 Login attempt:', {
        role: formData.role,
        endpoint,
        username: formData.username
      });
      
      const response = await api.post(endpoint, {
        username: formData.username,
        password: formData.password
      });

      console.log('✅ Login response:', response.data);

      // Store authentication data with role-specific keys
      const keys = formData.role === 'admin' ? {
        token: 'admin_access_token',
        refresh: 'admin_refresh_token',
        userId: 'admin_user_id',
        username: 'admin_username',
        name: 'admin_name',
        isAuth: 'admin_isAuthenticated'
      } : {
        token: 'member_access_token',
        refresh: 'member_refresh_token',
        userId: 'member_user_id',
        username: 'member_username',
        name: 'member_name',
        memberId: 'member_id',
        isAuth: 'member_isAuthenticated'
      };

      localStorage.setItem(keys.token, response.data.access_token || response.data.token);
      localStorage.setItem(keys.refresh, response.data.refresh);
      localStorage.setItem(keys.userId, response.data.user_id);
      localStorage.setItem(keys.username, response.data.username || formData.username);
      localStorage.setItem(keys.name, response.data.name || formData.username);
      localStorage.setItem(keys.isAuth, 'true');
      
      if (formData.role === 'member') {
        localStorage.setItem(keys.memberId, response.data.member_id || response.data.athlete_id);
      }

      console.log('🔑 Stored keys:', Object.keys(localStorage));
      console.log('🔑 Token stored:', localStorage.getItem(keys.token) ? 'yes' : 'no');
      console.log('🔑 Auth status:', localStorage.getItem(keys.isAuth));

      // Redirect based on role
      const redirectPath = formData.role === 'admin' ? '/admin/dashboard' : '/member-dashboard';
      console.log('🚀 Redirecting to:', redirectPath);
      navigate(redirectPath);
    } catch (err) {
      console.error('❌ Login error:', err.response?.data || err.message);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.error || 
        'Login failed. Please check your credentials.'
      );
    }

    setLoading(false);
  };



  // Show loading while checking maintenance mode
  if (checkingMaintenance) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center px-4"
        style={{
          backgroundImage: `url('/images/loginimage.jpg')`
        }}
      >
        <div className="absolute inset-0 bg-black/80"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }



  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('/images/gymlogin.jpg')`,
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80"></div>

      {/* Back to Main Website Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-md sm:rounded-lg transition-all duration-200 backdrop-blur-sm border border-yellow-500/30 cursor-pointer"
        >
          <i className="bx bx-arrow-back text-base sm:text-lg"></i>
          <span className="text-xs sm:text-sm font-medium sm:hidden">Back</span>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Back to main website</span>
        </button>
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-400/50">
                <i className="bx bx-dumbbell text-3xl text-black"></i>
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">Welcome Back</h2>
            <p className="text-gray-300">Sign in to your Elite Fitness account</p>
          </div>

          {/* Maintenance Warning for Members */}
          {maintenanceMode && (
            <div className="mb-6 p-4 bg-orange-900/50 border border-orange-500 rounded-lg">
              <div className="flex items-center">
                <i className="bx bx-wrench text-orange-400 mr-2"></i>
                <p className="text-orange-300 text-sm">
                  System is under maintenance. Only admin access is available.
                </p>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="flex bg-gray-800/60 backdrop-blur-md rounded-lg p-1 mb-6 border border-yellow-500/30">
            <button
              type="button"
              onClick={() => !maintenanceMode && handleRoleChange("member")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                formData.role === "member"
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              } ${maintenanceMode ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
              disabled={maintenanceMode}
            >
              <i className="bx bx-user mr-2"></i>
              Member
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("admin")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                formData.role === "admin"
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <i className="bx bx-shield-alt-2 mr-2"></i>
              Admin
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 shadow-xl border border-yellow-500/20">
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md">
                  <p className="text-red-400 text-sm flex items-center">
                    <i className="bx bx-error-circle mr-2"></i>
                    {error}
                  </p>
                </div>
              )}

              {maintenanceMode && formData.role === "member" && (
                <div className="mb-4 p-3 bg-orange-900/50 border border-orange-500 rounded-md">
                  <p className="text-orange-400 text-sm flex items-center">
                    <i className="bx bx-info-circle mr-2"></i>
                    Member login is disabled during maintenance. Please try
                    again later.
                  </p>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="bx bx-user text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none transition-all duration-200"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 lg:pt-4">
                <label className="block text-sm font-medium  text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="bx bx-lock-alt text-gray-400"></i>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    <i
                      className={`bx ${showPassword ? "bx-hide" : "bx-show"}`}
                    ></i>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (maintenanceMode && formData.role === 'member')}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="bx bx-log-in mr-2"></i>
                    Sign in as {formData.role === "admin" ? "Admin" : "Member"}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <button className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors duration-200">
                Contact Admin (07xxxxxxxx)
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;