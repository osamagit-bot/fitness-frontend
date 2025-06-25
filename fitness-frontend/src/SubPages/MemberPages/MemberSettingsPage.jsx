import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiShield, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../utils/api';

function MemberSettingsPage() {

  const token = localStorage.getItem('access_token');
  const memberId = localStorage.getItem('memberId');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
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
  
        const { first_name, last_name, user_email, phone, avatar } = response.data;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();
        setUserData({ name: fullName, email:user_email, phone, avatar });
  
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
      await api.post(
        `members/request_delete/`,
        {}, // empty body
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
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
    localStorage.removeItem('token');
    localStorage.removeItem('memberId');
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
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <motion.div
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row gap-8">
          
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Header */}
           
              {/* Sections */}
              <div className="divide-y divide-gray-200">
                {/* Profile Section */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Profile Information</h2>
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      onClick={() => setShowUpdateForm(true)}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{userData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{userData.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{userData.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="font-medium">June 2023</p>
                    </div>
                  </div>
                </div>
                
                {/* Security Section */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Security</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FiLock className="text-blue-600" />
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <button 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={() => setShowPasswordForm(true)}
                      >
                        Change
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FiShield className="text-blue-600" />
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Not enabled</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Notifications Section */}
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive important updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.email}
                          onChange={() => handleNotificationToggle('email')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Receive text message alerts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.sms}
                          onChange={() => handleNotificationToggle('sms')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive app notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.app}
                          onChange={() => handleNotificationToggle('app')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Marketing Communications</p>
                        <p className="text-sm text-gray-500">Receive promotional emails</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifications.marketing}
                          onChange={() => handleNotificationToggle('marketing')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Danger Zone */}
                <div className="p-6 bg-red-50 rounded-b-lg">
                  <h2 className="text-lg font-semibold text-red-800 mb-4">Danger Zone</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-red-100">
                      <div>
                        <p className="font-medium text-red-800">Delete Account</p>
                        <p className="text-sm text-red-600">Permanently remove your account and all data</p>
                      </div>
                      <button 
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition"
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
              className="bg-white rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Change Password</h3>
                  <button 
                    onClick={() => setShowPasswordForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword 
                            ? 'border-red-500' 
                            : 'border-gray-300'
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
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg text-white transition ${
                        loading || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 8
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
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
              className="bg-white rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Update Profile</h3>
                  <button 
                    onClick={() => setShowUpdateForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleUpdateFormChange}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="text-gray-400" />
                      </div>
                      <input
                        className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-gray-400" />
                      </div>
                      <input
                        className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        type="tel"
                        name="phone"
                        value={userData.phone}
                        onChange={handleUpdateFormChange}
                        placeholder="+1 (123) 456-7890"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => setShowUpdateForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg text-white transition ${
                        loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
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
              className="bg-white rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-red-600">Request Account Deletion</h3>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="font-medium text-red-800 mb-2">What happens when you request deletion?</h4>
                    <ul className="text-sm text-red-700 space-y-2 list-disc list-inside">
                      <li>Your account will be deactivated immediately</li>
                      <li>Our team will review your request within 48 hours</li>
                      <li>All your personal data will be permanently deleted</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <h4 className="font-medium text-yellow-800 mb-2">Consider these alternatives</h4>
                    <ul className="text-sm text-yellow-700 space-y-2">
                      <li>• Temporarily deactivate your account instead</li>
                      <li>• Update your notification preferences</li>
                      <li>• Contact support for assistance</li>
                    </ul>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-4">To confirm, please type <span className="font-bold">"DELETE MY ACCOUNT"</span> below:</p>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-white transition ${
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
