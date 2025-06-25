import axios from 'axios';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const RegisterTrainerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for generated credentials
  const [generatedCredentials, setGeneratedCredentials] = useState({
    email: '',
    password: '',
    username: ''
  });

  const [showCredentials, setShowCredentials] = useState(false);
  
  // Initialize state for trainer data
  const [trainerData, setTrainerData] = useState(() => {
    // Default state for new trainer registration
    const today = new Date();
    
    return {
      trainer_id: '',
      first_name: '',
      last_name: '',
      monthly_salary: '',
      specialization: 'fitness',
      phone: '',
      start_date: today.toISOString().split('T')[0],
      email: '',
    };
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      setPageReady(false); // Start with page not ready
      
      const token = localStorage.getItem('access_token');
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      
      if (!token || isAuthenticated !== 'true') {
        navigate('/login');
        return;
      }
      
      // Test auth endpoint
      await testAuth();
      setPageReady(true); // Page is now ready to render
    };
    
    checkAuth();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTrainerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Test authentication status
  const testAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Using token:', token);
      
      if (!token) {
        throw new Error('No token found');
      }
      
      // Just do a simple check, don't try to use trainerDataWithAuth here
      const response = await axios.get(
        'api.newdomain.com/api/test-auth/', 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Auth test result:', response.data);
      setAuthStatus(response.data);
      return true;
    } catch (error) {
      console.error('Auth test failed:', error);
      setAuthStatus({
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  };

  // Function to refresh dashboard stats
  const refreshStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      await axios.get('api.newdomain.com/admin/stats/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Dashboard stats refreshed');
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  // Function to generate a random password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Generate a username from first name and trainer ID
  const generateUsername = (firstName, trainerId) => {
    return `trainer_${firstName.toLowerCase()}${trainerId}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowCredentials(false);
  
    try {
      // Get the token from local storage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      // Generate a password for the new trainer
      const generatedPassword = generatePassword();
      const username = generateUsername(trainerData.first_name, trainerData.trainer_id);
      
      // Store generated credentials for display
      setGeneratedCredentials({
        email: trainerData.email,
        password: generatedPassword,
        username: username
      });
      
      // Format the trainer data to match the API's expected structure
      const trainerDataWithAuth = {
        trainer_id: trainerData.trainer_id,
        first_name: trainerData.first_name,
        last_name: trainerData.last_name,
        email: trainerData.email,
        phone: trainerData.phone,
        monthly_salary: parseFloat(trainerData.monthly_salary), // Convert to number
        specialization: trainerData.specialization,
        start_date: trainerData.start_date,
        // Auth fields
        username: username,
        password: generatedPassword
      };
      
      // Store in localStorage for later access
      localStorage.setItem('lastTrainerCredentials', JSON.stringify({
        email: trainerData.email,
        password: generatedPassword,
        username: username,
        name: `${trainerData.first_name} ${trainerData.last_name}`,
        trainerId: trainerData.trainer_id,
        timestamp: new Date().toISOString()
      }));
      
      console.log('Submitting trainer data with auth:', trainerDataWithAuth);
      
      // Use the trainer registration endpoint
      const response = await axios.post(
        'api.newdomain.com/api/trainers/', 
        trainerDataWithAuth,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Trainer registration successful:', response.data);
      setSuccess(`Trainer registered successfully: ${trainerData.first_name} ${trainerData.last_name}`);
      setShowCredentials(true);
      
      // Reset form for new registrations
      const today = new Date();
      
      setTrainerData({
        trainer_id: '',
        first_name: '',
        last_name: '',
        monthly_salary: '',
        specialization: 'fitness',
        phone: '',
        start_date: today.toISOString().split('T')[0],
        email: '',
      });
      
      // Refresh dashboard stats
      await refreshStats();
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Improved error handling
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.log('Error response status:', status);
        console.log('Error response data:', data);
        
        if (typeof data === 'object') {
          const errorMessages = [];
          
          // Extract error messages from the response data object
          for (const key in data) {
            if (Array.isArray(data[key])) {
              errorMessages.push(`${key}: ${data[key].join(' ')}`);
            } else {
              errorMessages.push(`${key}: ${data[key]}`);
            }
          }
          
          if (errorMessages.length > 0) {
            setError(errorMessages.join('\n'));
          } else {
            setError(`Error ${status}: ${JSON.stringify(data)}`);
          }
        } else if (typeof data === 'string') {
          setError(`Error ${status}: ${data}`);
        } else {
          setError(`Error ${status}: Unknown server error`);
        }
      } else {
        setError(error.message || 'An error occurred during registration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Register New Trainer
      </h1>
      
      {/* Debug Authentication Status */}
      {authStatus && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
          <h3 className="font-bold">Auth Status:</h3>
          <pre>{JSON.stringify(authStatus, null, 2)}</pre>
          <p className="mt-2">
            Token in localStorage: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p className="font-bold">Success!</p>
          <p>{success}</p>
        </div>
      )}
      
      {/* Trainer Credentials Display */}
      {showCredentials && (
        <div className="mb-6 p-4 border-2 border-yellow-400 bg-yellow-50 rounded-md">
          <h2 className="text-lg font-bold text-black mb-2">Trainer Login Credentials</h2>
          <p className="mb-1"><span className="font-medium">Username:</span> {generatedCredentials.username}</p>
          <p className="mb-1"><span className="font-medium">Email:</span> {generatedCredentials.email}</p>
          <p className="mb-3"><span className="font-medium">Password:</span> {generatedCredentials.password}</p>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <svg className="h-5 w-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
            <p>Please save these credentials to share with the trainer. They will need them to log in.</p>
          </div>
          
          {/* Continue button */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
      
      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Trainer ID</label>
            <input
              type="text"
              name="trainer_id"
              value={trainerData.trainer_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={trainerData.first_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={trainerData.last_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={trainerData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              placeholder="trainer@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={trainerData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Salary (AFN)</label>
            <input
              type="number"
              name="monthly_salary"
              value={trainerData.monthly_salary}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Specialization</label>
            <select
              name="specialization"
              value={trainerData.specialization}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="fitness">Fitness</option>
              <option value="yoga">Yoga</option>
              <option value="cardio">Cardio</option>
              <option value="strength">Strength Training</option>
              <option value="nutrition">Nutrition</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={trainerData.start_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 ${loading ? 'bg-yellow-300' : 'bg-yellow-500 hover:bg-yellow-600'} text-black rounded`}
          >
            {loading ? 'Registering...' : 'Register Trainer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterTrainerPage;
