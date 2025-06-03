import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

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
  
  // Initialize state with URL parameters if in renewal mode
  const [memberData, setMemberData] = useState(() => {
    // If this is a renewal, pre-populate the form with URL parameters
    if (isRenewal) {
      // Get today's date and one month later for expiry
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
      };
    }
    
    // Default state for new registration
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
      phone:'',
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
      
      const token = localStorage.getItem('token');
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
  }, [navigate, isRenewal, originalAthleteId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Test authentication status
  const testAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Using token:', token);
      
      const response = await axios.get('http://127.0.0.1:8000/api/test/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.get('http://127.0.0.1:8000/admin/stats/', {
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

  // Generate a username from first name and athlete ID
  const generateUsername = (firstName, athleteId) => {
    return `${firstName.toLowerCase()}${athleteId}`;
  };

  // For renewal, update the existing record
  const renewMembership = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      // Format date for API consistency
      const formattedExpiryDate = memberData.expiry_date;
      
      console.log(`Updating member ${memberData.athlete_id} with new expiry date: ${formattedExpiryDate}`);
      
      // Include box_number and time_slot in the update
      const updateData = { 
        expiry_date: formattedExpiryDate,
        box_number: memberData.box_number,
        time_slot: memberData.time_slot
      };
      
      // Update the existing member
      const response = await axios.patch(
        `http://127.0.0.1:8000/api/members/${memberData.athlete_id}/`, 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Membership renewed successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error renewing membership:', error);
      throw error;
    }
  };

  // Verify renewal was successful
  const verifyRenewal = async (athleteId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      // Check the member's current data
      const response = await axios.get(
        `http://127.0.0.1:8000/api/members/${athleteId}/`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Current member data after renewal:', response.data);
      console.log('Expiry date after renewal:', response.data.expiry_date);
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
      // Get the token from local storage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      let response;
      
      // Handle renewal differently
      if (isRenewal) {
        response = await renewMembership();
        
        // Set a flag that membership was renewed to force refresh
        localStorage.setItem('membershipRenewed', 'true');
        
        // Verify the renewal took effect
        const verifiedData = await verifyRenewal(memberData.athlete_id);
        console.log('Verified renewal data:', verifiedData);
        
        setSuccess(`Membership renewed successfully for ${memberData.first_name} ${memberData.last_name} until ${new Date(memberData.expiry_date).toLocaleDateString()}`);
      } else {
        // Regular registration flow for new members with auth
        // Generate a password for the new member
        const generatedPassword = generatePassword();
        const username = generateUsername(memberData.first_name, memberData.athlete_id);
        
        // Store generated credentials for display
        setGeneratedCredentials({
          email: memberData.email,
          password: generatedPassword,
          username: username
        });
        
        // Add auth fields to member data
        const memberDataWithAuth = {
          ...memberData,
          password: generatedPassword,
          username: username
        };
        
        // Store in localStorage for later access
        localStorage.setItem('lastMemberCredentials', JSON.stringify({
          email: memberData.email,
          password: generatedPassword,
          username: username,
          name: `${memberData.first_name} ${memberData.last_name}`,
          athleteId: memberData.athlete_id,
          timestamp: new Date().toISOString()
        }));
        
        console.log('Submitting member data with auth:', memberDataWithAuth);
        
        // Use the existing endpoint for member registration
        const response = await axios.post(
          'http://127.0.0.1:8000/api/register-member/',
          memberDataWithAuth,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        // Get the actual username from the response
        const actualUsername = response.data.auth?.username || username;
        // Store the actual username in localStorage
       
        
        console.log('Registration with auth successful:', response.data);
        setSuccess(`Athlete registered successfully: ${memberData.first_name} ${memberData.last_name}`);
        setShowCredentials(true);
        
        // Reset form for new registrations
        const today = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        
        setMemberData({
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
        });
      }
      
      // Refresh dashboard stats
      await refreshStats();
      
      // Show success message before redirecting
      // If we're showing credentials, give more time
      if (!showCredentials) {
        // Only auto-redirect if we're not showing credentials
        setTimeout(() => {
          navigate('/admin/members');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Registration/renewal error:', error);
      
      // Set error message based on the response
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          setError(JSON.stringify(error.response.data));
        } else {
          setError(error.response.data);
        }
      } else {
        setError(error.message || 'An error occurred during registration/renewal');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator while page is preparing
  if (!pageReady) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isRenewal ? 'Renew Membership' : 'Register New Athlete'}
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
          {!showCredentials && <p>Redirecting to members page...</p>}
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
          
          {/* Continue button */}
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
