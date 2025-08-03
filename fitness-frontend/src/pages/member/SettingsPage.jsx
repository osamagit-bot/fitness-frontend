import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from "../../utils/api";
import { getRelativeTime } from "../../utils/timeUtils";

function MemberSettingsPage() {

  const token = localStorage.getItem('member_access_token');
  const memberId = localStorage.getItem('member_id');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    passwordLastChanged: null
  });

  // Modal states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    app: true,
    marketing: false
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get(
          `members/${memberId}/`,
          { headers: { 'Authorization': `Bearer ${token}` }}
        );
  
        const { first_name, last_name, user_email, phone, avatar, password_last_changed } = response.data;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();
        const storedPasswordChanged = localStorage.getItem(`passwordLastChanged_${memberId}`);
        const passwordChanged = password_last_changed || storedPasswordChanged;
        
        setUserData({ 
          name: fullName, 
          email: user_email, 
          phone, 
          avatar,
          passwordLastChanged: passwordChanged
        });
  
        // Log for debug
        console.log(response.data);
  
        // Store in localStorage
        localStorage.setItem(`userName_${memberId}`, fullName);
        localStorage.setItem(`userEmail_${memberId}`, user_email);
        localStorage.setItem(`userPhone_${memberId}`, phone);
        if (avatar) localStorage.setItem(`userAvatar_${memberId}`, avatar);
  
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };
  
    fetchUserData();
  }, [memberId, token]);
  

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle update form changes
  const handleUpdateFormChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle notification toggle
  const handleNotificationToggle = async (type) => {
    const newNotifications = {
      ...notifications,
      [type]: !notifications[type]
    };
    setNotifications(newNotifications);
    
    try {
      await api.patch(
        `members/${memberId}/notification-preferences/`,
        { preferences: newNotifications },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      toast.success('Notification preferences updated!');
    } catch (err) {
      toast.error('Failed to update notification preferences');
      // Revert on error
      setNotifications(prev => ({
        ...prev,
        [type]: !prev[type]
      }));
    }
  };

  // Password reset handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match!");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    console.log('memberid', memberId);
    setLoading(true);
    try {
      await api.post(
        `members/${memberId}/change_password/`,
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      const newTimestamp = new Date().toISOString();
      setUserData(prev => ({ ...prev, passwordLastChanged: newTimestamp }));
      localStorage.setItem(`passwordLastChanged_${memberId}`, newTimestamp);
      toast.success("Password changed successfully!");
    } catch (err) {
      toast.error(`Failed to change password: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Profile update handler
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(
        `members/${memberId}/`,
        {
          email: userData.email,
          phone: userData.phone,
          first_name: userData.name.split(" ")[0] || "",
          last_name: userData.name.split(" ").slice(1).join(" ") || ""
        },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
     
      localStorage.setItem(`userName_${memberId}`, userData.name);
      localStorage.setItem(`userEmail_${memberId}`, userData.email);
      localStorage.setItem(`userPhone_${memberId}`, userData.phone);
      setShowUpdateForm(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(`Failed to update profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  

  // Account deletion request
  
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await api.post('members/request_delete/', {});  // Axios adds Authorization header
      setShowDeleteModal(false);
      toast.info("Account deletion request sent. Our team will contact you.");
    } catch (err) {
      console.error('Error:', err.response?.data || err.message);
      toast.error(`Failed to request account deletion: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('member_access_token');
    localStorage.removeItem('member_refresh_token');
    localStorage.removeItem('member_user_id');
    localStorage.removeItem('member_username');
    localStorage.removeItem('member_name');
    localStorage.removeItem('member_id');
    localStorage.removeItem('member_isAuthenticated');
    window.location.href = '/login';
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size should be less than 2MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      setLoading(true);
      const response = await api.patch(
        `members/${memberId}/avatar/`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      const newAvatar = response.data.avatar;
      setUserData(prev => ({ ...prev, avatar: newAvatar }));
      localStorage.setItem(`userAvatar_${memberId}`, newAvatar);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <motion.div
        className="container mx-auto px-3 sm:px-4 py-6 sm:py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col gap-6 sm:gap-8">
          
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-sm sm:text-base text-gray-300">Manage your profile, security, and preferences</p>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden border border-gray-600">
              {/* Sections */}
              <div className="divide-y divide-gray-600">
                {/* Profile Section */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
                    <h2 className="text-base sm:text-lg font-semibold text-white">Profile Information</h2>
                    <button 
                      className="text-yellow-400 hover:text-yellow-300 text-sm font-medium px-2 py-1"
                      onClick={() => setShowUpdateForm(true)}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Name</p>
                      <p className="font-medium text-white text-sm sm:text-base break-words">{userData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Email</p>
                      <p className="font-medium text-white text-sm sm:text-base break-all">{userData.email}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Phone</p>
                      <p className="font-medium text-white text-sm sm:text-base">{userData.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Member Since</p>
                      <p className="font-medium text-white text-sm sm:text-base">June 2023</p>
                    </div>
                  </div>
                </div>
                
                {/* Security Section */}
                <div className="p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-white">Security</h2>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-gray-600 rounded-lg border border-gray-500 gap-3 sm:gap-0">
                      <div className="flex items-center space-x-3">
                        <FiLock className="text-yellow-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-white text-sm sm:text-base">Password</p>
                          <p className="text-xs sm:text-sm text-gray-400">
                            Last changed {userData.passwordLastChanged ? getRelativeTime(userData.passwordLastChanged) : 'never'}
                          </p>
                        </div>
                      </div>
                      <button 
                        className="text-yellow-400 hover:text-yellow-300 text-sm font-medium px-2 py-1 self-end sm:self-auto"
                        onClick={() => setShowPasswordForm(true)}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
                
      
                
                {/* Danger Zone */}
                <div className="p-4 sm:p-6 bg-red-900 bg-opacity-20 rounded-b-lg border-t border-red-500">
                  <h2 className="text-base sm:text-lg font-semibold text-red-400 mb-3 sm:mb-4">Danger Zone</h2>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-gray-600 rounded-lg border border-red-500 gap-3 sm:gap-0">
                      <div className="min-w-0">
                        <p className="font-medium text-red-400 text-sm sm:text-base">Delete Account</p>
                        <p className="text-xs sm:text-sm text-red-300">Permanently remove your account and all data</p>
                      </div>
                      <button 
                        className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-700 transition"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        Request Deletion
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

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
              className="bg-gray-700 rounded-xl w-full max-w-md mx-4 border border-gray-600"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Change Password</h3>
                  <button 
                    onClick={() => setShowPasswordForm(false)}
                    className="text-gray-400 hover:text-gray-200 p-1"
                  >
                    <FiX size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        className="w-full px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base"
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">New Password</label>
                    <div className="relative">
                      <input
                        className="w-full px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base"
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters long</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        className={`w-full px-3 sm:px-4 py-2 border rounded-lg bg-gray-600 text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base ${
                          passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword 
                            ? 'border-red-500' 
                            : 'border-gray-600'
                        }`}
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition text-sm sm:text-base"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-black transition text-sm sm:text-base ${
                        loading || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 8
                          ? 'bg-yellow-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                      }`}
                      disabled={loading || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 8}
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-gray-700 rounded-xl w-full max-w-md mx-4 border border-gray-600"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Update Profile</h3>
                  <button 
                    onClick={() => setShowUpdateForm(false)}
                    className="text-gray-400 hover:text-gray-200 p-1"
                  >
                    <FiX size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">Full Name</label>
                    <input
                      className="w-full px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base"
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleUpdateFormChange}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-400" size={16} />
                      </div>
                      <input
                        className="w-full pl-9 sm:pl-10 px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base"
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleUpdateFormChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-gray-400" size={16} />
                      </div>
                      <input
                        className="w-full pl-9 sm:pl-10 px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base"
                        type="tel"
                        name="phone"
                        value={userData.phone}
                        onChange={handleUpdateFormChange}
                        placeholder="+1 (123) 456-7890"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition text-sm sm:text-base"
                      onClick={() => setShowUpdateForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-black transition text-sm sm:text-base ${
                        loading ? 'bg-yellow-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                      }`}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Deletion Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-700 rounded-xl w-full max-w-md mx-4 border border-gray-600 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-base sm:text-xl font-bold text-red-400 pr-2">Request Account Deletion</h3>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-gray-200 p-1 flex-shrink-0"
                  >
                    <FiX size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-red-900 bg-opacity-20 p-3 sm:p-4 rounded-lg border border-red-500">
                    <h4 className="font-medium text-red-400 mb-2 text-sm sm:text-base">What happens when you request deletion?</h4>
                    <ul className="text-xs sm:text-sm text-red-300 space-y-1 sm:space-y-2 list-disc list-inside">
                      <li>Your account will be deactivated immediately</li>
                      <li>Our team will review your request within 48 hours</li>
                      <li>All your personal data will be permanently deleted</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-900 bg-opacity-20 p-3 sm:p-4 rounded-lg border border-yellow-500">
                    <h4 className="font-medium text-yellow-400 mb-2 text-sm sm:text-base">Consider these alternatives</h4>
                    <ul className="text-xs sm:text-sm text-yellow-300 space-y-1 sm:space-y-2">
                      <li>• Temporarily deactivate your account instead</li>
                      <li>• Update your notification preferences</li>
                      <li>• Contact support for assistance</li>
                    </ul>
                  </div>
                  
                  <div className="pt-2 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4">To confirm, please type <span className="font-bold text-white">"DELETE MY ACCOUNT"</span> below:</p>
                    <input
                      type="text"
                      className="w-full px-3 sm:px-4 py-2 border border-gray-600 bg-gray-600 text-white rounded-lg mb-3 sm:mb-4 text-sm sm:text-base"
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      className="w-full sm:w-auto px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition text-sm sm:text-base"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white transition text-sm sm:text-base ${
                        loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                      }`}
                      onClick={handleDeleteAccount}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Request Permanent Deletion'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MemberSettingsPage;
