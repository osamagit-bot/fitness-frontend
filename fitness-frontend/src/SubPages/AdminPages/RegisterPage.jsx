import { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';


const ConfirmationPrompt = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success' 
}) => {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <FiCheckCircle className="h-6 w-6 text-green-500" />,
      title: 'text-green-800',
      message: 'text-green-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <FiAlertCircle className="h-6 w-6 text-red-500" />,
      title: 'text-red-800',
      message: 'text-red-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <FiAlertCircle className="h-6 w-6 text-yellow-500" />,
      title: 'text-yellow-800',
      message: 'text-yellow-600'
    }
  };

  const currentColor = colors[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className={`${currentColor.bg} ${currentColor.border} border-l-4 p-4`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {currentColor.icon}
              </div>
              <div className="ml-3 w-0 flex-1 pt-0.5">
                <h3 className={`text-lg font-medium ${currentColor.title}`}>
                  {title}
                </h3>
                <div className={`mt-1 text-sm ${currentColor.message}`}>
                  <p>{message}</p>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={onClose}
                  className={`${currentColor.bg} rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  <span className="sr-only">Close</span>
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const isRenewal = queryParams.get('renewMode') === 'true';
  const originalAthleteId = queryParams.get('athleteId') || '';
  
  // State for generated credentials
  const [generatedCredentials, setGeneratedCredentials] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [showCredentials, setShowCredentials] = useState(false);
  
  // Confirmation prompt state
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState({
    title: '',
    message: '',
    type: 'success'
  });
  
  // Initialize state with URL parameters if in renewal mode
  const [memberData, setMemberData] = useState(() => {
    if (isRenewal) {
      const today = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      return {
        athlete_id: originalAthleteId || '',
        first_name: queryParams.get('firstName') || '',
        last_name: queryParams.get('lastName') || '',
        monthly_fee: queryParams.get('monthlyFee') || '',
        membership_type: queryParams.get('membershipType') || 'gym',
        box_number: queryParams.get('boxNumber') || '',
        time_slot: queryParams.get('timeSlot') || 'morning',
        start_date: today.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        email: queryParams.get('email') || '',
        phone: queryParams.get('phone') || '',
      };
    }
    
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    return {
      athlete_id: '',
      first_name: '',
      last_name: '',
      monthly_fee: '',
      membership_type: 'gym',
      box_number: '',
      time_slot: 'morning',
      start_date: today.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      email: '',
      phone: '',
    };
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const showConfirmationPrompt = (title, message, type = 'success') => {
    setPromptData({ title, message, type });
    setShowPrompt(true);
  };

  useEffect(() => {
    const checkAuth = async () => {
      setPageReady(false);
      
      const token = localStorage.getItem('token');
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      
      if (!token || isAuthenticated !== 'true') {
        navigate('/login');
        return;
      }
      
      await testAuth();
      setPageReady(true);
    };
    
    checkAuth();
  }, [navigate, isRenewal, originalAthleteId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('test/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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

  const refreshStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await api.get('admin/stats/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateUsername = (firstName, athleteId) => {
    return `${firstName.toLowerCase()}${athleteId}`;
  };

  const renewMembership = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const formattedExpiryDate = memberData.expiry_date;
      
      const updateData = { 
        expiry_date: formattedExpiryDate,
        box_number: memberData.box_number,
        time_slot: memberData.time_slot
      };
      
      const response = await api.patch(
        `members/${memberData.athlete_id}/`, 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error renewing membership:', error);
      throw error;
    }
  };

  const verifyRenewal = async (athleteId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const response = await api.get(
        `members/${athleteId}/`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error verifying renewal:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setShowCredentials(false);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      let response;
      
      if (isRenewal) {
        response = await renewMembership();
        localStorage.setItem('membershipRenewed', 'true');
        const verifiedData = await verifyRenewal(memberData.athlete_id);
        
        showConfirmationPrompt(
          'Success', 
          `Membership renewed successfully for ${memberData.first_name} ${memberData.last_name} until ${new Date(memberData.expiry_date).toLocaleDateString()}`,
          'success'
        );
      } else {
        const generatedPassword = generatePassword();
        const username = generateUsername(memberData.first_name, memberData.athlete_id);
        
        setGeneratedCredentials({
          email: memberData.email,
          password: generatedPassword,
          username: username
        });
        
        const memberDataWithAuth = {
          ...memberData,
          password: generatedPassword,
          username: username
        };
        
        localStorage.setItem('lastMemberCredentials', JSON.stringify({
          email: memberData.email,
          password: generatedPassword,
          username: username,
          name: `${memberData.first_name} ${memberData.last_name}`,
          athleteId: memberData.athlete_id,
          timestamp: new Date().toISOString()
        }));
        
        response = await api.post(
          'members/register/',
          memberDataWithAuth,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        showConfirmationPrompt(
          'Success', 
          `Athlete registered successfully: ${memberData.first_name} ${memberData.last_name}`,
          'success'
        );
        setShowCredentials(true);
        
        setMemberData({
          athlete_id: '',
          first_name: '',
          last_name: '',
          monthly_fee: '',
          membership_type: 'gym',
          box_number: '',
          time_slot: 'morning',
          start_date: new Date().toISOString().split('T')[0],
          expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
          email: '',
          phone: '',
        });
      }
      
      await refreshStats();
      
      if (!showCredentials) {
        setTimeout(() => {
          navigate('/admin/members');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Registration/renewal error:', error);
      
      let errorMessage = error.message || 'An error occurred during registration/renewal';
      if (error.response?.data) {
        errorMessage = typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data) 
          : error.response.data;
      }
      
      showConfirmationPrompt('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!pageReady) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ConfirmationPrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        title={promptData.title}
        message={promptData.message}
        type={promptData.type}
      />
      
      <h1 className="text-2xl font-bold mb-4">
        {isRenewal ? 'Renew Membership' : 'Register New Athlete'}
      </h1>
      
      {authStatus && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
          <h3 className="font-bold">Auth Status:</h3>
          <pre>{JSON.stringify(authStatus, null, 2)}</pre>
          <p className="mt-2">
            Token in localStorage: {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}
          </p>
        </div>
      )}
      
      {/* Member Credentials Display */}
      {showCredentials && (
        <div className="mb-6 p-4 border-2 border-yellow-400 bg-yellow-50 rounded-md">
          <h2 className="text-lg font-bold text-black mb-2">Member Login Credentials</h2>
          <p className="mb-1"><span className="font-medium">Username:</span> {generatedCredentials.username}</p>
          <p className="mb-1"><span className="font-medium">Email:</span> {generatedCredentials.email}</p>
          <p className="mb-3"><span className="font-medium">Password:</span> {generatedCredentials.password}</p>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <svg className="h-5 w-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
            <p>Please save these credentials to share with the member. They will need them to log in.</p>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/members')}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
            >
              Continue to Members Page
            </button>
          </div>
        </div>
      )}
      
      {/* Registration/Renewal Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Athlete ID</label>
            <input
              type="text"
              name="athlete_id"
              value={memberData.athlete_id}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={memberData.first_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={memberData.last_name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={memberData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required={!isRenewal}
              disabled={isRenewal}
              placeholder="member@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Fee (AFN)</label>
            <input
              type="number"
              name="monthly_fee"
              value={memberData.monthly_fee}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Membership Type</label>
            <select
              name="membership_type"
              value={memberData.membership_type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            >
              <option value="gym">Gym</option>
              <option value="fitness">Fitness</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Box Number</label>
            <input
              type="text"
              name="box_number"
              value={memberData.box_number}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Time Slot</label>
            <select
              name="time_slot"
              value={memberData.time_slot}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="all_day">All Day</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={memberData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required={!isRenewal}
              disabled={isRenewal}
              placeholder="07XXXXXXXXX"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={memberData.start_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              disabled={isRenewal}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              value={memberData.expiry_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/members')}
            className="mr-4 px-4 py-2 text-gray-700 border border-gray-300 rounded shadow hover:bg-gray-200"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded shadow`}
            disabled={loading}
          >
            {loading ? 'Processing...' : isRenewal ? 'Renew Membership' : 'Register Athlete'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;