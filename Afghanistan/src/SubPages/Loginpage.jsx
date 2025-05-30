import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
  const [loginType, setLoginType] = useState('member');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const BACKEND_URL = 'http://127.0.0.1:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;

      if (loginType === 'member') {
        response = await axios.post(`${BACKEND_URL}/api/member-login/`, { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refresh || '');
        localStorage.setItem('userType', 'member');
        localStorage.setItem('memberId', response.data.member_id);
        localStorage.setItem('memberID', response.data.member_id);
        localStorage.setItem('userId', response.data.user_id);
        localStorage.setItem('name', response.data.name);
        localStorage.setItem('isAuthenticated', 'true');
        setTimeout(() => navigate('/member-dashboard'), 300);
      } else if (loginType === 'trainer') {
        response = await axios.post(`${BACKEND_URL}/api/trainer-login/`, { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refresh || '');
        localStorage.setItem('userType', 'trainer');
        localStorage.setItem('trainerId', response.data.trainer_id);
        localStorage.setItem('userId', response.data.user_id);
        localStorage.setItem('name', response.data.name);
        localStorage.setItem('isAuthenticated', 'true');
        setTimeout(() => navigate('/trainer-dashboard'), 300);
      } else if (loginType === 'admin') {
        response = await axios.post(`${BACKEND_URL}/api/admin-login/`, { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refresh || '');
        localStorage.setItem('userType', 'admin');
        localStorage.setItem('userId', response.data.user_id);
        localStorage.setItem('name', response.data.name);
        localStorage.setItem('isAuthenticated', 'true');
        setTimeout(() => navigate('/admin/dashboard'), 300);
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Invalid credentials. Please check your username and password.');
        } else if (err.response.status === 403) {
          setError('You do not have permission to access this resource.');
        } else if (err.response.status === 404) {
          setError('Login endpoint not found. Please contact support.');
        } else {
          setError(err.response.data.detail || 'Login failed. Please contact support.');
        }
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('/images/login1.jpeg')` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-lg"></div>

      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl shadow-xl px-8 py-10">
        <div className="flex justify-center items-center -mt-16 mb-6">
          <div className="bg-black/50 p-6 w-28 text-center rounded-full shadow-md">
            <i className="bx bx-user text-6xl text-yellow-500"></i>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {['member', 'admin'].map((type) => (
            <button
              key={type}
              onClick={() => setLoginType(type)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                loginType === type
                  ? 'bg-black text-yellow-500 shadow-md'
                  : 'text-gray-300 border border-black hover:bg-white/20'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-100 text-red-800 text-sm rounded-md shadow-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <i className="bx bx-envelope absolute left-3 top-1 text-white/70 text-2xl"></i>
            <input
              type="text"
              autoComplete='off'
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-3 py-2 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            />
          </div>

          <div className="relative">
            <i className="bx bx-lock-alt absolute left-3 top-1 text-white/70 text-2xl"></i>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-3 py-2 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            />
          </div>


          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-md font-semibold transition shadow-sm ${
              loading
                ? 'bg-white/30 text-white cursor-not-allowed'
                : 'bg-black/50 text-yellow-400 hover:bg-black/70'
            }`}
          >
            {loading ? 'Logging in...' : `Login as ${loginType.charAt(0).toUpperCase() + loginType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
