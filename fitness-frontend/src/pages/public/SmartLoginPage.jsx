import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import smartAuth from '../../features/auth/smartAuth';

const SmartLoginPage = () => {
  const [loginType, setLoginType] = useState('member');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  const authEnv = smartAuth.getAuthEnvironment();
  const isDev = authEnv.environment === 'development';
  const isProd = authEnv.environment === 'production';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log(`🔐 Starting ${authEnv.environment} authentication...`);
      
      const result = await smartAuth.authenticateUser({ username, password }, loginType);
      
      if (result.success) {
        console.log('✅ Authentication successful:', result.sessionData);
        
        // Navigate based on login type
        if (loginType === 'member') {
          setTimeout(() => navigate('/member-dashboard'), 500);
        } else if (loginType === 'admin') {
          setTimeout(() => navigate('/admin/dashboard'), 500);
        }
      } else {
        // Check if the error is from maintenance mode
        if (result.maintenanceMode) {
          setError(result.maintenanceMessage || 'Sorry! The system is under maintenance mode. We will be back online shortly!');
        } else if (result.status === 404) {
          // Handle 404 - User not found
          if (loginType === 'admin') {
            setError(`Email "${username}" not found. Please check your email and try again.`);
          } else {
            setError(`Username "${username}" not found. Please check your username and try again.`);
          }
        } else if (result.status === 401) {
          // Handle 401 - Wrong credentials (could be email or password)
          if (loginType === 'admin') {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else {
            setError('Invalid username or password. Please check your credentials and try again.');
          }
        } else if (result.status === 400) {
          // Handle 400 - Bad request (could be validation errors)
          setError(result.error || 'Invalid login credentials. Please check your username and password.');
        } else {
          // Generic error
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('🚨 Login error:', err);
      
      // Check if it's a maintenance mode error (only for members)
      if (err.response?.status === 503 && err.response?.data?.maintenance_mode) {
        setError(err.response.data.user_message || 'Sorry! The system is under maintenance mode. We will be back online shortly!');
      } else if (err.response?.status === 404) {
        // Handle 404 - User not found
        if (loginType === 'admin') {
          setError(`Email "${username}" not found. Please check your email and try again.`);
        } else {
          setError(`Username "${username}" not found. Please check your username and try again.`);
        }
      } else if (err.response?.status === 401) {
        // Handle 401 - Wrong credentials (could be email or password)
        if (loginType === 'admin') {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError('Invalid username or password. Please check your credentials and try again.');
        }
      } else if (err.response?.status === 400) {
        // Handle 400 - Bad request (could be validation errors)
        setError(err.response?.data?.detail || 'Invalid login credentials. Please check your username and password.');
      } else {
        // Generic error
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      }
    }
    
    setLoading(false);
  };

  const handleInputFocus = () => {
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center relative overflow-hidden">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 flex items-center space-x-2 text-white/70 hover:text-white transition-all duration-200 group"
      >
        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all duration-200">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </div>
        <span className="lg:text-md font-medium hidden sm:inline">
          Back to Home
        </span>
      </Link>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      ></div>

      <div
        className={`relative z-10 max-w-md w-full mx-4 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Environment Badge - Simplified */}
        {isDev && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full mr-2 bg-green-400 animate-pulse"></div>
              DEV MODE
            </div>
          </div>
        )}

        {/* Main login card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-300">
              Sign in to access your fitness journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-200">
                Choose your role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLoginType("member")}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    loginType === "member"
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                      : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Member</span>
                  </div>
                  {loginType === "member" && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full"></div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLoginType("admin")}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    loginType === "admin"
                      ? "border-purple-500 bg-purple-500/20 text-purple-300"
                      : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  {loginType === "admin" && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                {loginType === 'admin' ? 'Email' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={loginType === 'admin' ? 'Enter your email' : 'Enter your username'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                loginType === "member"
                  ? "bg-gradient-to-r from-yellow-600 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 focus:ring-blue-500"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500"
              } ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-lg transform hover:scale-[1.02]"
              } focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Sign in as {loginType}</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Powered by Smart Authentication System
          </p>
          <div className="flex justify-center space-x-4 mt-2 text-xs text-gray-500">
            <span>🔐 Secure</span>
            <span>⚡ Fast</span>
            <span>🎯 Smart</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartLoginPage;
