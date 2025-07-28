import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AppToastContainer from '../../components/ui/ToastContainer';
import api from "../../utils/api";
import { showToast } from '../../utils/toast';

function MemberProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [member, setMember] = useState(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Form states
  const [updateFormData, setUpdateFormData] = useState({
    email: '',
    phone: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const token = localStorage.getItem('member_access_token');
  const memberId = localStorage.getItem('member_id');

  // Load member data
  useEffect(() => {
    async function loadMemberData() {
      if (!token || !memberId) {
        setError("Missing authentication information");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use api.get with relative URL and headers
        const response = await api.get(`members/${memberId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const memberData = response.data;
        setMember(memberData);

        // Pre-fill update form
        setUpdateFormData({
          email: memberData.user_email || '',
          phone: memberData.phone || ''
        });

        setLoading(false);
      } catch (err) {
        setError("Failed to load profile data");
        setLoading(false);
      }
    }

    loadMemberData();
  }, [memberId, token]);

  // Handle form field changes
  const handleUpdateFormChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle update form submission
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    if (!member) {
      showToast.warn("Cannot update: Member data not loaded");
      return;
    }

    setLoading(true);
    try {
      await api.put(
        `members/${memberId}/`,
        {
          ...member,
          email: updateFormData.email,
          phone: updateFormData.phone
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMember(prev => ({
        ...prev,
        email: updateFormData.email,
        phone: updateFormData.phone
      }));

      setShowUpdateForm(false);
      showToast.success("Profile updated successfully!");
    } catch (err) {
      showToast.error(`Failed to update profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.warn("New passwords don't match!");
      return;
    }

    setLoading(true);

    const passwordPayload = {
      current_password: passwordData.currentPassword,
      new_password: passwordData.newPassword
    };

    try {
      await api.post(
        `members/${memberId}/change_password/`,
        passwordPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      showToast.success("Password changed successfully!");
    } catch (err) {
      if (err.response && err.response.data) {
        showToast.error(`Failed to change password: ${JSON.stringify(err.response.data)}`);
      } else {
        showToast.error(`Failed to change password: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <motion.div
        className="p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-32 w-full rounded-lg mb-6"></div>
          <div className="bg-gray-200 h-6 w-1/4 rounded mb-4"></div>
          <div className="bg-gray-200 h-32 w-full rounded-lg"></div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="p-4 mt-5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <motion.div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </motion.div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-amber-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Reload Page
        </button>
      </motion.div>
    );
  }

  if (!member) {
    return (
      <motion.div
        className="p-4 mt-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">No data: </strong>
          <span className="block sm:inline">Member data unavailable</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-amber-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Reload Page
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <AppToastContainer />
      <motion.div
        className="p-4 mt-5 min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded"
        >
          Refresh Data
        </button>
      </div>

      {/* Debug Data */}
      <motion.div
        className="mb-4 mt-5 p-2 bg-gray-700 rounded text-xs text-gray-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <details>
          <summary className="cursor-pointer font-bold">API Debug Data (Click to expand)</summary>
          <pre className="mt-2 overflow-auto max-h-40">{JSON.stringify(member, null, 2)}</pre>
          <p className="mt-2">Member ID: {memberId}</p>
        </details>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black p-6 rounded-xl mb-6 shadow-lg"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start">
          <div className="bg-black text-yellow-400 rounded-full w-24 h-24 flex items-center justify-center text-4xl font-bold mb-4 sm:mb-0 sm:mr-6 shadow-md">
            {member.first_name ? member.first_name[0].toUpperCase() : 'M'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{member.first_name} {member.last_name}</h2>
            <p className="text-gray-800 capitalize">{member.membership_type}</p>
            <div className="mt-2">
              <span className="bg-black text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full">
                Premium Member
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        className="bg-gray-700 p-6 rounded-lg shadow mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-bold mb-6 text-white">Personal Information</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Member ID</p>
              <p className="font-semibold text-white">MEM-{member.athlete_id}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Username</p>
              <p className="font-semibold text-white">{member.username || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Email</p>
              <p className="font-semibold text-white">{member.user_email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Phone</p>
              <p className="font-semibold text-white">{member.phone || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Registered On</p>
              <p className="font-semibold text-white">{member.start_date || 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300">Membership Fee</p>
              <p className="font-semibold text-white">{member.monthly_fee ? `${member.monthly_fee} AFN` : '0.00 AFN'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button 
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200"
            onClick={() => setShowUpdateForm(true)}
          >
            Update Profile
          </button>
          <button 
            className="bg-gray-600 border-2 border-yellow-500 text-yellow-400 hover:bg-gray-500 font-bold py-2 px-4 rounded-lg transition-all duration-200"
            onClick={() => setShowPasswordForm(true)}
          >
            Change Password
          </button>
        </div>
      </motion.div>

      {/* Update Profile Modal */}
      <AnimatePresence>
        {showUpdateForm && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 rounded-lg mt-16 lg:ml-64 w-full max-w-md p-6"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <h3 className="text-xl font-bold mb-4 text-white">Update Profile</h3>
              <form onSubmit={handleUpdateSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
                    Email
                  </label>
                  <input 
                    className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none"
                    id="email"
                    type="email"
                    name="email"
                    value={updateFormData.email}
                    onChange={handleUpdateFormChange}
                    placeholder="Email"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="phone">
                    Phone
                  </label>
                  <input 
                    className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none"
                    id="phone"
                    type="tel"
                    name="phone"
                    value={updateFormData.phone}
                    onChange={handleUpdateFormChange}
                    placeholder="Phone number"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                    type="button"
                    onClick={() => setShowUpdateForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded focus:outline-none"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordForm && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 mt-10 lg:ml-20 rounded-lg w-full max-w-md p-6"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <h3 className="text-xl font-bold mb-4 text-white">Change Password</h3>
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <input 
                    className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none"
                    id="currentPassword"
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Current password"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="newPassword">
                    New Password
                  </label>
                  <input 
                    className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none"
                    id="newPassword"
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="New password"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input 
                    className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none"
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                  {passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword && (
                    <p className="text-red-500 text-xs italic">Passwords do not match</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-4 rounded focus:outline-none"
                    type="submit"
                    disabled={loading || (passwordData.newPassword !== passwordData.confirmPassword)}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  );
}

export default MemberProfilePage;
