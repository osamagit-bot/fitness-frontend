import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../utils/api";
function AdminSettingsPage() {
  const token = localStorage.getItem("admin_access_token");
  const [loading, setLoading] = useState(false);

  // Notification preferences - start with loading state
  const [notifications, setNotifications] = useState({
    email: false,
    whatsapp: false,
    app: true,
    memberAlerts: true,
    systemUpdates: false,
  });

  // Maintenance mode state - start with loading state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Member credentials state
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Password reset modal for member
  const [resetMemberId, setResetMemberId] = useState(null);
  const [resetMemberLoading, setResetMemberLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Add state for restore functionality
  const [backupFiles, setBackupFiles] = useState([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Add state for backup inspection
  const [inspectedBackup, setInspectedBackup] = useState(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);

  // Fetch all members
  const fetchMembers = async () => {
    const loadingState = refreshLoading ? setRefreshLoading : setMembersLoading;
    loadingState(true);
    try {
      const res = await api.get(`members/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("🔍 Settings page - Full API response:", res.data);
      console.log("🔍 Settings page - Response structure:", {
        hasResults: !!res.data.results,
        isArray: Array.isArray(res.data),
        dataType: typeof res.data,
        dataKeys: Object.keys(res.data || {}),
      });
      
      const membersData = res.data.results || res.data;
      console.log("🔍 Settings page - Members data:", membersData);
      
      setMembers(membersData);
      if (refreshLoading) {
        toast.success("Member list refreshed!");
      }
    } catch (err) {
      console.error("❌ Settings page - Error fetching members:", err);
      toast.error("Failed to load members");
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
      m.id,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );


const fetchGlobalNotificationSettings = async () => {
  try {
    const response = await api.get(
      "/get_global_notification_settings/",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setNotifications((prev) => ({
      ...prev,
      email: response.data.email_notifications_enabled || false,
      whatsapp: response.data.whatsapp_notifications_enabled || false,
    }));
  } catch (error) {
    console.error("Error loading global notification settings:", error);
    // Set default values if API fails
    setNotifications(prev => ({
      ...prev,
      email: false,
      whatsapp: false,
    }));
  }
};



  // Generate random password
  function generateRandomPassword(length = 12) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  // Show confirmation modal before resetting password
  const handleGeneratePasswordClick = (memberId) => {
    setPendingMemberId(memberId);
    setConfirmModalOpen(true);
    setNewPassword("");
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
          new_password: passwordToSet,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGeneratedPassword(passwordToSet);
      setResetMemberId(memberId);
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(
        `Failed to reset password: ${err.response?.data?.detail || err.message}`
      );
    } finally {
      setResetMemberLoading(false);
      setPendingMemberId(null);
      setNewPassword("");
    }
  };

  // Copy password to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast.success("Password copied to clipboard!");
  };

  // Handle maintenance mode toggle
  const handleMaintenanceModeToggle = async () => {
    setLoading(true);
    const newState = !maintenanceMode;
    
    try {
      const response = await api.post(
        "/admin-dashboard/set-maintenance-mode/",
        {
          enabled: newState,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update state only after successful API call
      setMaintenanceMode(newState);
      toast.success(
        `Maintenance mode ${newState ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      toast.error("Failed to toggle maintenance mode");
      // Don't update state if API call failed
    } finally {
      setLoading(false);
    }
  };

  // Handle export all member data
  const handleExportAllMembers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin-dashboard/export-members/", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `members_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Member data exported successfully!");
    } catch (error) {
      console.error("Error exporting members:", error);
      toast.error("Failed to export member data");
    } finally {
      setLoading(false);
    }
  };

  // Load maintenance mode status and notification preferences
  useEffect(() => {
    const loadSettings = async () => {
      if (!token) return;
      
      try {
        // Load notification settings
        await fetchGlobalNotificationSettings();
        
        // Load maintenance mode status
        try {
          const maintenanceResponse = await api.get("/admin-dashboard/maintenance-mode/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMaintenanceMode(maintenanceResponse.data.enabled || false);
        } catch (error) {
          console.error("Error loading maintenance mode status:", error);
          // Set default value if API fails
          setMaintenanceMode(false);
        }
        
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, [token]);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Membership status helpers
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  // Add email notification handler
  const handleEmailNotificationToggle = async () => {
    try {
      const response = await api.post(
        "/set_global_notification_settings/",
        { email_notifications_enabled: !notifications.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => ({
        ...prev,
        email: response.data.email_notifications_enabled,
      }));
      toast.success("Email notification setting updated!");
    } catch (error) {
      toast.error("Failed to update email notification setting");
      console.error("Global email notification error:", error);
    }
  };

  // Add WhatsApp notification handler
  const handleWhatsAppNotificationToggle = async () => {
    try {
      const response = await api.post(
        "/set_global_notification_settings/",
        { whatsapp_notifications_enabled: !notifications.whatsapp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => ({
        ...prev,
        whatsapp: response.data.whatsapp_notifications_enabled,
      }));
      toast.success("WhatsApp notification setting updated!");
    } catch (error) {
      toast.error("Failed to update WhatsApp notification setting");
      console.error("Global WhatsApp notification error:", error);
    }
  };

  // Add test email function
  const handleTestEmail = async () => {
    setLoading(true);
    try {
      await api.post(
        'notifications/test_email_notification/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Test email sent successfully!');
    } catch (error) {
      toast.error('Failed to send test email');
      console.error('Test email error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSystemTest = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        'notifications/test_email_system/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Email System Test Results:', response.data);
      
      if (response.data.email_sent) {
        toast.success('✅ Email system test passed! Check your email.');
      } else {
        toast.warning('⚠️ Email configured but sending failed. Check console.');
      }
      
      // Show detailed results in console
      console.table(response.data.config);
      
    } catch (error) {
      toast.error('❌ Email system test failed');
      console.error('Email system test error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add WhatsApp test functions
  const handleTestWhatsApp = async () => {
    setLoading(true);
    try {
      await api.post(
        'notifications/test_whatsapp_notification/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Test WhatsApp message sent successfully!');
    } catch (error) {
      toast.error('Failed to send test WhatsApp message');
      console.error('Test WhatsApp error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSystemTest = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        'notifications/test_whatsapp_system/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('WhatsApp System Test Results:', response.data);
      
      if (response.data.whatsapp_sent) {
        toast.success('✅ WhatsApp system test passed! Check your phone.');
      } else {
        toast.warning('⚠️ WhatsApp configured but sending failed. Check console.');
      }
      
      // Show detailed results in console
      console.table(response.data.config);
      
    } catch (error) {
      toast.error('❌ WhatsApp system test failed');
      console.error('WhatsApp system test error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add backup system handler
  const handleBackupSystem = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        '/backup-database/',  // Updated URL with /api/ prefix
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Backup System Results:', response.data);
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n📁 ${response.data.details.filename}\n📊 ${response.data.details.records} records (${response.data.details.size_kb} KB)`);
      } else {
        toast.error(`❌ ${response.data.message}`);
      }
      
    } catch (error) {
      toast.error('❌ Backup system failed');
      console.error('Backup system error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available backup files
  const fetchBackupFiles = async () => {
    try {
      const response = await api.get('/list-backups/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setBackupFiles(response.data.backups);
      }
    } catch (error) {
      console.error('Error fetching backup files:', error);
      toast.error('Failed to load backup files');
    }
  };

  // Handle restore system
  const handleRestoreSystem = async () => {
    if (!selectedBackup) return;
    
    setRestoreLoading(true);
    setShowRestoreModal(false);
    
    try {
      const response = await api.post(
        '/restore-database/',
        { backup_filename: selectedBackup.filename },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.message}\n📁 Restored from: ${response.data.details.restored_from}\n📊 ${response.data.details.records_restored} records restored\n🛡️ Emergency backup: ${response.data.details.emergency_backup}`);
        
        // Refresh the page after successful restore
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.error(`❌ ${response.data.message}`);
      }
      
    } catch (error) {
      toast.error('❌ Database restore failed');
      console.error('Restore error:', error);
    } finally {
      setRestoreLoading(false);
      setSelectedBackup(null);
    }
  };

  // Open restore modal
  const openRestoreModal = async () => {
    await fetchBackupFiles();
    setShowRestoreModal(true);
  };

  // Inspect backup file contents
  const inspectBackupFile = async (filename) => {
    setInspectionLoading(true);
    try {
      const response = await api.get(`/inspect-backup/?filename=${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setInspectedBackup(response.data);
      }
    } catch (error) {
      console.error('Error inspecting backup:', error);
      toast.error('Failed to inspect backup file');
    } finally {
      setInspectionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black">
      <ToastContainer position="top-right" autoClose={5000} />

      <motion.div
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
            <p className="text-gray-300">
              Manage member accounts and system settings
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg transition-all duration-300"
          >
            <FiLogOut /> Logout
          </button>
        </motion.div>

        {/* Member Credentials Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-gray-700 rounded-xl shadow-md overflow-hidden mb-8 border border-gray-600"
        >
          <div className="p-6 border-b border-gray-600">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">
                Member Credentials
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSearch("");
                    setRefreshLoading(true);
                    fetchMembers();
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-lg transition-all duration-300"
                  disabled={refreshLoading}
                >
                  <FiRefreshCw
                    className={refreshLoading ? "animate-spin" : ""}
                  />
                  <span>Refresh</span>
                </button>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-white placeholder-gray-400 w-full md:w-64"
                    placeholder="Search members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
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
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-300"
                    >
                      {search
                        ? "No matching members found"
                        : "No members available"}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isExpired = isMembershipExpired(member.expiry_date);
                    const isExpiringSoon = isMembershipExpiringSoon(
                      member.expiry_date
                    );
                    const daysRemaining = getDaysRemaining(member.expiry_date);
                    const memberId = member.athlete_id || member.id;

                    return (
                      <tr
                        key={memberId}
                        className={`
                          ${isExpired ? "bg-red-900/20" : ""}
                          ${isExpiringSoon ? "bg-yellow-900/20" : ""}
                          hover:bg-gray-600
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {memberId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {member.first_name?.charAt(0)}
                              {member.last_name?.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div
                                className={`text-sm font-medium ${
                                  isExpired ? "text-red-400" : "text-white"
                                }`}
                              >
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-sm text-gray-300">
                                @{member.username || "no-username"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {member.email}
                          </div>
                          <div className="text-sm text-gray-300">
                            {member.phone || "No phone"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {member.membership_type || "None"}
                          </div>
                          <div className="text-sm text-gray-300">
                            {member.expiry_date
                              ? formatDate(member.expiry_date)
                              : "No expiry"}
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
                            onClick={() =>
                              handleGeneratePasswordClick(memberId)
                            }
                            disabled={
                              resetMemberLoading && resetMemberId === memberId
                            }
                            className={`px-4 py-2 rounded-md text-white ${
                              resetMemberLoading && resetMemberId === memberId
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            }`}
                          >
                            {resetMemberLoading && resetMemberId === memberId
                              ? "Resetting..."
                              : "Reset Password"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
        

        {/* Admin Settings Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Notifications Card */}
          <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                Notification Preferences
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-600 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-gray-300">Receive important updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settingsLoaded ? notifications.email : false}
                      onChange={handleEmailNotificationToggle}
                      disabled={!settingsLoaded}
                    />
                    <div className={`w-11 h-6 bg-gray-500 border border-gray-400 rounded-full peer peer-checked:bg-yellow-500 peer-checked:border-yellow-400 transition-colors ${!settingsLoaded ? 'opacity-50' : ''}`}></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                  </label>
                </div>
                
                {/* WhatsApp Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-600 rounded-lg">
                  <div>
                    <p className="font-medium text-white">WhatsApp Notifications</p>
                    <p className="text-sm text-gray-300">Receive important updates via WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settingsLoaded ? notifications.whatsapp : false}
                      onChange={handleWhatsAppNotificationToggle}
                      disabled={!settingsLoaded}
                    />
                    <div className={`w-11 h-6 bg-gray-500 border border-gray-400 rounded-full peer peer-checked:bg-yellow-500 peer-checked:border-yellow-400 transition-colors ${!settingsLoaded ? 'opacity-50' : ''}`}></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                  </label>
                </div>
                
                {/* Test Buttons Row */}
                <div className="grid grid-cols-2 gap-3 px-4">
                  {/* Email Test Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-300 text-center">Email Tests</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEmailSystemTest}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Testing...' : 'System Test'}
                      </button>
                      <button
                        onClick={handleTestEmail}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Sending...' : 'Send Test'}
                      </button>
                    </div>
                  </div>
                  
                  {/* WhatsApp Test Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-300 text-center">WhatsApp Tests</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleWhatsAppSystemTest}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Testing...' : 'System Test'}
                      </button>
                      <button
                        onClick={handleTestWhatsApp}
                        disabled={loading}
                        className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Sending...' : 'Send Test'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

             
             

            
            </div>
          </div>

          {/* System Settings Card */}
          <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                System Settings
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Database Backup & Restore Section */}
              <div>
                <h3 className="text-lg font-medium text-white mb-3">
                  🗄️ Database Management
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Backup Button */}
                  <button
                    onClick={handleBackupSystem}
                    disabled={loading}
                    className={`px-6 py-4 text-white rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      loading
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span className="font-semibold">Creating Backup...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">💾</span>
                          <span className="font-semibold text-lg">Backup Database</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Restore Button */}
                  <button
                    onClick={openRestoreModal}
                    disabled={loading || restoreLoading}
                    className={`px-6 py-4 text-white rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      loading || restoreLoading
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      {restoreLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span className="font-semibold">Restoring...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl">🔄</span>
                          <span className="font-semibold text-lg">Restore Database</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
                
                <p className="text-sm text-gray-300 mt-3 text-center">
                  Create secure backups and restore from previous states. Emergency backup is created automatically before restore.
                </p>
              </div>

              {/* Restore Modal */}
              {showRestoreModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600">
                    <h3 className="text-xl font-bold text-white mb-4">⚠️ Restore Database</h3>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">
                        <strong>Warning:</strong> This will replace your current database with the selected backup. 
                        An emergency backup will be created automatically.
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white mb-2">
                        Select Backup File:
                      </label>
                      <select
                        value={selectedBackup?.filename || ''}
                        onChange={(e) => {
                          const backup = backupFiles.find(b => b.filename === e.target.value);
                          setSelectedBackup(backup);
                          setInspectedBackup(null);
                          if (backup) {
                            inspectBackupFile(backup.filename);
                          }
                        }}
                        className="w-full p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-gray-700 text-white"
                      >
                        <option value="">Choose a backup...</option>
                        {backupFiles.map((backup) => (
                          <option key={backup.filename} value={backup.filename}>
                            {backup.created} ({backup.size_kb} KB)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Backup inspection results */}
                    {inspectionLoading && (
                      <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                          <span className="text-sm text-blue-300">Inspecting backup...</span>
                        </div>
                      </div>
                    )}
                    
                    {inspectedBackup && (
                      <div className="mb-4 p-3 bg-gray-700 border border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                        <h4 className="font-medium text-white mb-2">📋 Backup Contents:</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div className="font-semibold text-yellow-400">📊 Total Records: {inspectedBackup.total_records}</div>
                          
                          {/* Core System Data */}
                          <div className="mt-3">
                            <div className="font-medium text-white mb-1">👤 User Management:</div>
                            <div className="ml-2 space-y-1">
                              <div>👥 Users: {inspectedBackup.model_counts['Authentication.customuser'] || 0}</div>
                              <div>🏃 Members: {inspectedBackup.model_counts['Member.member'] || 0}</div>
                              <div>💪 Trainers: {inspectedBackup.model_counts['Member.trainer'] || 0}</div>
                              <div>💳 Membership Payments: {inspectedBackup.model_counts['Member.membershippayment'] || 0}</div>
                            </div>
                          </div>
                          
                          {/* Training & Fitness Data */}
                          <div className="mt-3">
                            <div className="font-medium text-white mb-1">🏋️ Training & Fitness:</div>
                            <div className="ml-2 space-y-1">
                              <div>📅 Training Sessions: {inspectedBackup.model_counts['Member.training'] || 0}</div>
                              <div>✅ Attendance Records: {inspectedBackup.model_counts['Attendance.attendance'] || 0}</div>
                            </div>
                          </div>
                          
                          {/* Shop & Commerce Data */}
                          <div className="mt-3">
                            <div className="font-medium text-white mb-1">🛒 Shop & Commerce:</div>
                            <div className="ml-2 space-y-1">
                              <div>📦 Products: {inspectedBackup.model_counts['Purchase.product'] || 0}</div>
                              <div>🛍️ Purchases: {inspectedBackup.model_counts['Purchase.purchase'] || 0}</div>
                            </div>
                          </div>
                          
                          {/* Community & Communication */}
                          <div className="mt-3">
                            <div className="font-medium text-white mb-1">💬 Community & Communication:</div>
                            <div className="ml-2 space-y-1">
                              <div>📢 Announcements: {inspectedBackup.model_counts['Community.announcement'] || 0}</div>
                              <div>🏆 Challenges: {inspectedBackup.model_counts['Community.challenge'] || 0}</div>
                              <div>📝 Posts: {inspectedBackup.model_counts['Community.post'] || 0}</div>
                              <div>💭 Comments: {inspectedBackup.model_counts['Community.comment'] || 0}</div>
                              <div>🎫 Support Tickets: {inspectedBackup.model_counts['Community.supportticket'] || 0}</div>
                              <div>📋 FAQ Categories: {inspectedBackup.model_counts['Community.faqcategory'] || 0}</div>
                              <div>❓ FAQs: {inspectedBackup.model_counts['Community.faq'] || 0}</div>
                            </div>
                          </div>
                          
                          {/* System & Notifications */}
                          <div className="mt-3">
                            <div className="font-medium text-white mb-1">🔔 System & Notifications:</div>
                            <div className="ml-2 space-y-1">
                              <div>🔔 Notifications: {inspectedBackup.model_counts['Notifications.notification'] || 0}</div>
                              <div>⚙️ Site Settings: {inspectedBackup.model_counts['Management.sitesettings'] || 0}</div>
                            </div>
                          </div>
                          
                          {/* Member Details Preview */}
                          {inspectedBackup.members && inspectedBackup.members.length > 0 && (
                            <div className="mt-3">
                              <div className="font-medium text-white mb-1">👥 Members Preview:</div>
                              <div className="ml-2 max-h-20 overflow-y-auto text-xs bg-gray-800 p-2 rounded">
                                {inspectedBackup.members.slice(0, 5).map((member, idx) => (
                                  <div key={idx} className="text-gray-400 py-1">
                                    ID: {member.athlete_id || member.pk} | {member.first_name} {member.last_name} | {member.membership_type || 'Standard'}
                                  </div>
                                ))}
                                {inspectedBackup.members.length > 5 && (
                                  <div className="text-gray-500 italic">...and {inspectedBackup.members.length - 5} more</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Trainer Details Preview */}
                          {inspectedBackup.trainers && inspectedBackup.trainers.length > 0 && (
                            <div className="mt-3">
                              <div className="font-medium text-white mb-1">💪 Trainers Preview:</div>
                              <div className="ml-2 max-h-16 overflow-y-auto text-xs bg-gray-800 p-2 rounded">
                                {inspectedBackup.trainers.map((trainer, idx) => (
                                  <div key={idx} className="text-gray-400 py-1">
                                    ID: {trainer.trainer_id || trainer.pk} | {trainer.first_name} {trainer.last_name} | {trainer.specialization || 'General'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRestoreModal(false);
                          setSelectedBackup(null);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRestoreSystem}
                        disabled={!selectedBackup}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition ${
                          selectedBackup
                            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                            : "bg-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Restore Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-white mb-3">
                  Maintenance Mode
                </h3>
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <p className="text-white">Enable maintenance mode</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settingsLoaded ? maintenanceMode : false}
                      onChange={handleMaintenanceModeToggle}
                      disabled={loading || !settingsLoaded}
                    />
                    <div
                      className={`w-11 h-6 bg-gray-500 border border-gray-400 rounded-full peer peer-checked:bg-yellow-500 peer-checked:border-yellow-400 transition ${
                        loading || !settingsLoaded ? "opacity-50" : ""
                      }`}
                    ></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-300 mt-2">
                  When enabled, only admins can access the system.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">
                  Data Export
                </h3>
                <button
                  onClick={handleExportAllMembers}
                  disabled={loading}
                  className={`w-full px-4 py-3 text-white rounded-lg transition ${
                    loading
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  }`}
                >
                  {loading ? "Exporting..." : "Export All Member Data"}
                </button>
                <p className="text-sm text-gray-300 mt-2">
                  Download a CSV file with all member information.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
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
              className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-600"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    Reset Member Password
                  </h3>
                  <button
                    onClick={() => setConfirmModalOpen(false)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-300">
                    You are about to reset the password for member ID:{" "}
                    <span className="font-bold text-white">{pendingMemberId}</span>
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-700 text-white placeholder-gray-400"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
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
                        <label
                          htmlFor="showPassword"
                          className="text-sm text-gray-300"
                        >
                          Show password
                        </label>
                      </div>
                      <button
                        type="button"
                        className="text-sm bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-3 py-1 rounded"
                        onClick={() => setNewPassword(generateRandomPassword())}
                      >
                        Generate Random
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      className="px-4 py-2 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition"
                      onClick={() => setConfirmModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-white transition ${
                        resetMemberLoading
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      }`}
                      onClick={handleGenerateMemberPassword}
                      disabled={resetMemberLoading}
                    >
                      {resetMemberLoading ? "Processing..." : "Confirm Reset"}
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
              className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-600"
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-green-400">
                    Password Reset Complete
                  </h3>
                  <button
                    onClick={() => {
                      setResetMemberId(null);
                      setGeneratedPassword("");
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-300">
                    The password for member ID{" "}
                    <span className="font-bold text-white">{resetMemberId}</span> has been
                    successfully reset.
                  </p>

                  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white">New Password:</span>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <FiCopy /> Copy
                      </button>
                    </div>
                    <div className="font-mono text-lg bg-gray-800 text-white p-2 rounded border border-gray-600 select-all">
                      {generatedPassword}
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                      Please provide this password to the member securely.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-300"
                      onClick={() => {
                        setResetMemberId(null);
                        setGeneratedPassword("");
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


















