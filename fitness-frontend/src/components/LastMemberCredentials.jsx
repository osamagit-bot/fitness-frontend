import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MemberCredentials = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [lastMember, setLastMember] = useState(null);
  const [lastTrainer, setLastTrainer] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reset password state
  const [isResetting, setIsResetting] = useState(false);
  const [resetMemberId, setResetMemberId] = useState(null);
  const [resetMemberName, setResetMemberName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Get the last registered credentials from localStorage
  useEffect(() => {
    // Check localStorage for last registered member
    const storedMember = localStorage.getItem('lastMemberCredentials');
    if (storedMember) {
      try {
        setLastMember(JSON.parse(storedMember));
      } catch (e) {
        console.error('Error parsing member credentials:', e);
      }
    }
    
    // Check localStorage for last registered trainer
    const storedTrainer = localStorage.getItem('lastTrainerCredentials');
    if (storedTrainer) {
      try {
        setLastTrainer(JSON.parse(storedTrainer));
      } catch (e) {
        console.error('Error parsing trainer credentials:', e);
      }
    }
  }, []);

  // Filter members when search term or members data changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(members);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = members.filter(member => 
        (member.name && member.name.toLowerCase().includes(term)) ||
        (member.athlete_id && member.athlete_id.toString().includes(term)) ||
        (member.username && member.username.toLowerCase().includes(term)) ||
        (member.email && member.email.toLowerCase().includes(term))
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  // Add a new function to fetch all member credentials
  const fetchAllMemberCredentials = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Use debug endpoint for fetching member credentials
      const membersResponse = await axios.get('http://127.0.0.1:8000/api/debug/list-members/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Extract and enhance members array from the response
      let fetchedMembers = [];
      if (membersResponse.data && membersResponse.data.members) {
        fetchedMembers = membersResponse.data.members;
      } else if (Array.isArray(membersResponse.data)) {
        fetchedMembers = membersResponse.data;
      }
      
      setMembers(fetchedMembers);
      setFilteredMembers(fetchedMembers);
      
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError(`Failed to load credentials: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // When user clicks to show credentials, fetch the data
  const toggleCredentials = () => {
    if (!showCredentials) {
      fetchAllMemberCredentials();
    }
    setShowCredentials(!showCredentials);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };
  
  // Handle opening the reset password modal
  const openResetPasswordModal = (member) => {
    setResetMemberId(member.athlete_id);
    setResetMemberName(member.name);
    setNewPassword('');
    setResetSuccess(false);
    setResetError(null);
    setIsResetting(true);
  };
  
  // Close reset password modal
  const closeResetPasswordModal = () => {
    setIsResetting(false);
    setResetMemberId(null);
    setResetMemberName('');
    setNewPassword('');
    setResetSuccess(false);
    setResetError(null);
  };
  
  // Generate a random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };
  
  // Handle password reset submission
  // In your handlePasswordReset function in MemberCredentials.jsx
const handlePasswordReset = async (e) => {
  e.preventDefault();
  
  if (!resetMemberId || !newPassword) {
    setResetError('Member ID and new password are required');
    return;
  }
  
  setResetError(null);
  setResetSuccess(false);
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Try API endpoint with PUT method instead of POST
    const response = await axios({
      method: 'put', // Try PUT instead of POST
      url: `http://127.0.0.1:8000/api/admin/reset-member-password/`,
      data: {
        member_id: resetMemberId,
        new_password: newPassword
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Store the new password in localStorage for this member
    localStorage.setItem(`memberPassword_${resetMemberId}`, newPassword);
    
    // Update the members list with the new password
    const updatedMembers = members.map(member => {
      if (member.athlete_id === resetMemberId) {
        return {
          ...member,
          password: newPassword
        };
      }
      return member;
    });
    
    setMembers(updatedMembers);
    setFilteredMembers(updatedMembers);
    setResetSuccess(true);
    
    // Close the modal after 2 seconds
    setTimeout(() => {
      closeResetPasswordModal();
    }, 2000);
    
  } catch (err) {
    console.error('Error resetting password:', err);
    
    // Extract detailed error message
    let errorMessage = 'Failed to reset password';
    if (err.response && err.response.data && err.response.data.detail) {
      errorMessage = err.response.data.detail;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    // Handle "Method not allowed" error specifically
    if (err.response && err.response.status === 405) {
      errorMessage = 'Method not allowed. Please update the backend endpoint to accept POST requests.';
      
      // Fall back to client-side update
      localStorage.setItem(`memberPassword_${resetMemberId}`, newPassword);
      
      // Update the members list with the new password
      const updatedMembers = members.map(member => {
        if (member.athlete_id === resetMemberId) {
          return {
            ...member,
            password: newPassword
          };
        }
        return member;
      });
      
      setMembers(updatedMembers);
      setFilteredMembers(updatedMembers);
      setResetSuccess(true);
      errorMessage += ' (Password updated in UI only)';
      
      // Close the modal after 3 seconds
      setTimeout(() => {
        closeResetPasswordModal();
      }, 3000);
    }
    
    setResetError(errorMessage);
  }
};

  return (
    <div className="mb-8">
      <button
        onClick={toggleCredentials}
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2 px-4 mt-2 mb-4 rounded inline-flex items-center transition-colors duration-300 shadow-md"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
        {showCredentials ? 'Hide Credentials' : 'View All Member Credentials'}
      </button>
      
      {showCredentials && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-4">Member Credentials</h3>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'members'
                  ? 'border-b-2 border-yellow-500 text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              All Members
            </button>
            <button
              onClick={() => setActiveTab('last')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'last'
                  ? 'border-b-2 border-yellow-500 text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Last Registered
            </button>
          </div>
          
          {isLoading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500"></div>
            </div>
          )}
          
          {error && !isLoading && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
              <button 
                onClick={fetchAllMemberCredentials}
                className="ml-4 underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Members Tab */}
          {activeTab === 'members' && !isLoading && !error && (
            <div>
              {/* Search Bar */}
              <div className="mb-4 relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search members by name, ID, username or email..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  {searchTerm && (
                    <button 
                      onClick={clearSearch}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  )}
                </div>
                
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600">
                    Found {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} matching "{searchTerm}"
                  </div>
                )}
              </div>
              
              {/* Scrollable Container for Members */}
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member, index) => (
                      <div key={index} className="p-3 bg-white rounded shadow-md hover:shadow-lg transition-shadow duration-300">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-yellow-600">{member.name || 'Member'}</h4>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Member</span>
                        </div>
                        <p className="mb-1 mt-2"><span className="font-medium">Member ID:</span> {member.athlete_id}</p>
                        
                        {/* Show username if available */}
                        <p className="mb-1">
                          <span className="font-medium">Username:</span> {member.username || '—'}
                        </p>
                        
                        {/* Show email if available */}
                        <p className="mb-1">
                          <span className="font-medium">Email:</span> {member.email || '—'}
                        </p>
                        
                        {/* Show password if available */}
                        <p className="mb-1">
                          <span className="font-medium">Password:</span> 
                          {member.password ? (
                            <span className="text-green-600">{member.password}</span>
                          ) : (
                            <span className="text-red-500">Not available</span>
                          )}
                        </p>

                        {/* Password reset button */}
                        <button 
                          onClick={() => openResetPasswordModal(member)}
                          className="mt-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-1 px-3 rounded transition-colors duration-200"
                        >
                          Reset Password
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-4">
                      <p className="text-gray-500">
                        {searchTerm ? 'No members match your search.' : 'No members found.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Last Registered Tab */}
          {activeTab === 'last' && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Last Member */}
              <div>
                <h4 className="font-bold mb-2">Last Registered Member</h4>
                {lastMember ? (
                  <div className="p-3 bg-white rounded shadow-md">
                    <h4 className="font-bold text-yellow-600">{lastMember.name}</h4>
                    <p className="mb-1"><span className="font-medium">Member ID:</span> {lastMember.athleteId}</p>
                    <p className="mb-1"><span className="font-medium">Username:</span> {lastMember.username}</p>
                    <p className="mb-1"><span className="font-medium">Password:</span> {lastMember.password}</p>
                    <p className="text-xs text-gray-500">Registered on: {new Date(lastMember.timestamp).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded shadow-md">
                    <p className="text-gray-500">No recent member registration found.</p>
                  </div>
                )}
              </div>
              
              {/* Last Trainer */}
              <div>
                <h4 className="font-bold mb-2">Last Registered Trainer</h4>
                {lastTrainer ? (
                  <div className="p-3 bg-white rounded shadow-md">
                    <h4 className="font-bold text-green-600">{lastTrainer.name}</h4>
                    <p className="mb-1"><span className="font-medium">Trainer ID:</span> {lastTrainer.trainerId}</p>
                    <p className="mb-1"><span className="font-medium">Username:</span> {lastTrainer.username}</p>
                    <p className="mb-1"><span className="font-medium">Password:</span> {lastTrainer.password}</p>
                    <p className="text-xs text-gray-500">Registered on: {new Date(lastTrainer.timestamp).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded shadow-md">
                    <p className="text-gray-500">No recent trainer registration found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Password Reset Modal */}
      {isResetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Reset Password</h3>
            <form onSubmit={handlePasswordReset}>
              <div className="mb-4">
                <p><span className="font-medium">Member:</span> {resetMemberName}</p>
                <p><span className="font-medium">ID:</span> {resetMemberId}</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-r-md hover:bg-gray-300"
                  >
                    Generate
                  </button>
                </div>
              </div>
              
              {resetError && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
                  {resetError}
                </div>
              )}
              
              {resetSuccess && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
                  Password reset successful!
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #F59E0B;
        }
      `}</style>
    </div>
  );
};

export default MemberCredentials;
