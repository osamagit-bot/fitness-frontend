import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiCopy, FiEye, FiEyeOff, FiLogOut, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../utils/api';
function AdminSettingsPage() {
  
  const token = localStorage.getItem('access_token');
  const [loading, setLoading] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    app: true,
    memberAlerts: true,
    systemUpdates: false
  });

  // Member credentials state
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Password reset modal for member
  const [resetMemberId, setResetMemberId] = useState(null);
  const [resetMemberLoading, setResetMemberLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch all members
  const fetchMembers = async () => {
    const loadingState = refreshLoading ? setRefreshLoading : setMembersLoading;
    loadingState(true);
    try {
      const res = await api.get(`members/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(res.data.results || res.data);
      if (refreshLoading) {
        toast.success('Member list refreshed!');
      }
    } catch (err) {
      toast.error('Failed to load members');
      setMembers([]);
    } finally {
      loadingState(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [token]);

  // Filtered members based on search
  const filteredMembers = members.filter((m) =>
    [
      m.first_name,
      m.last_name,
      m.email,
      m.phone,
      m.username,
      m.athlete_id,
      m.id
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Generate random password
  function generateRandomPassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  // Show confirmation modal before resetting password
  const handleGeneratePasswordClick = (memberId) => {
    setPendingMemberId(memberId);
    setConfirmModalOpen(true);
    setNewPassword('');
  };

  // Reset member password handler
  const handleGenerateMemberPassword = async () => {
    const memberId = pendingMemberId;
    const passwordToSet = newPassword || generateRandomPassword();
    setResetMemberLoading(true);
    setConfirmModalOpen(false);
    try {
      await api.post(
        `members/reset_password/`,
        {
          member_id: memberId,
          new_password: passwordToSet
        },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      setGeneratedPassword(passwordToSet);
      setResetMemberId(memberId);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(`Failed to reset password: ${err.response?.data?.detail || err.message}`);
    } finally {
      setResetMemberLoading(false);
      setPendingMemberId(null);
      setNewPassword('');
    }
  };

  // Copy password to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast.success('Password copied to clipboard!');
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Membership status helpers
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isMembershipExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const isMembershipExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return false;
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Settings</h1>
            <p className="text-gray-600">Manage member accounts and system settings</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition"
          >
            <FiLogOut /> Logout
          </button>
        </div>

        {/* Member Credentials Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-800">Member Credentials</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSearch('');
                    setRefreshLoading(true);
                    fetchMembers();
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  disabled={refreshLoading}
                >
                  <FiRefreshCw className={refreshLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                    placeholder="Search members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {membersLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {search ? 'No matching members found' : 'No members available'}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isExpired = isMembershipExpired(member.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(member.expiry_date);
                    const daysRemaining = getDaysRemaining(member.expiry_date);
                    const memberId = member.athlete_id || member.id;

                    return (
                      <tr 
                        key={memberId}
                        className={`
                          ${isExpired ? 'bg-red-50' : ''}
                          ${isExpiringSoon ? 'bg-yellow-50' : ''}
                          hover:bg-gray-50
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {memberId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isExpired ? 'text-red-700' : 'text-gray-900'}`}>
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{member.username || 'no-username'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.email}</div>
                          <div className="text-sm text-gray-500">{member.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.membership_type || 'None'}</div>
                          <div className="text-sm text-gray-500">
                            {member.expiry_date ? formatDate(member.expiry_date) : 'No expiry'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isExpired ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              <FiAlertTriangle className="mr-1" /> Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Expires in {daysRemaining} days
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              <FiCheckCircle className="mr-1" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleGeneratePasswordClick(memberId)}
                            disabled={resetMemberLoading && resetMemberId === memberId}
                            className={`px-4 py-2 rounded-md text-white ${
                              resetMemberLoading && resetMemberId === memberId
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {resetMemberLoading && resetMemberId === memberId ? 'Resetting...' : 'Reset Password'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notifications Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive important updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.email}
                    onChange={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">App Push Notifications</p>
                  <p className="text-sm text-gray-500">Receive app notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.app}
                    onChange={() => setNotifications(prev => ({ ...prev, app: !prev.app }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Member Alerts</p>
                  <p className="text-sm text-gray-500">Get notified about member activities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.memberAlerts}
                    onChange={() => setNotifications(prev => ({ ...prev, memberAlerts: !prev.memberAlerts }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">System Updates</p>
                  <p className="text-sm text-gray-500">Receive technical notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.systemUpdates}
                    onChange={() => setNotifications(prev => ({ ...prev, systemUpdates: !prev.systemUpdates }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
            </div>
          </div>

          {/* System Settings Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">System Settings</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Maintenance Mode</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">Enable maintenance mode</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">When enabled, only admins can access the system.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">Data Export</h3>
                <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
                  Export All Member Data
                </button>
                <p className="text-sm text-gray-500 mt-2">Download a CSV file with all member information.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirm Reset Password Modal */}
      <AnimatePresence>
        {confirmModalOpen && (
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
                  <h3 className="text-xl font-bold text-gray-800">Reset Member Password</h3>
                  <button 
                    onClick={() => setConfirmModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    You are about to reset the password for member ID: <span className="font-bold">{pendingMemberId}</span>
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="showPassword"
                          checked={showPassword}
                          onChange={() => setShowPassword(!showPassword)}
                          className="mr-2"
                        />
                        <label htmlFor="showPassword" className="text-sm text-gray-600">Show password</label>
                      </div>
                      <button
                        type="button"
                        className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                        onClick={() => setNewPassword(generateRandomPassword())}
                      >
                        Generate Random
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={() => setConfirmModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-white transition ${
                        resetMemberLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      onClick={handleGenerateMemberPassword}
                      disabled={resetMemberLoading}
                    >
                      {resetMemberLoading ? 'Processing...' : 'Confirm Reset'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show Generated Password Modal */}
      <AnimatePresence>
        {resetMemberId && generatedPassword && (
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
                  <h3 className="text-xl font-bold text-green-600">Password Reset Complete</h3>
                  <button 
                    onClick={() => {
                      setResetMemberId(null);
                      setGeneratedPassword('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    The password for member ID <span className="font-bold">{resetMemberId}</span> has been successfully reset.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">New Password:</span>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <FiCopy /> Copy
                      </button>
                    </div>
                    <div className="font-mono text-lg bg-white p-2 rounded border border-gray-300 select-all">
                      {generatedPassword}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Please provide this password to the member securely.
                    </p>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      onClick={() => {
                        setResetMemberId(null);
                        setGeneratedPassword('');
                      }}
                    >
                      Close
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

export default AdminSettingsPage;