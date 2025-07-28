// src/SubPages/MemberPages/MemberDashboardPage.jsx

import "boxicons/css/boxicons.min.css";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../../components/LoadingScreen";

import api from "../../utils/api";

const MemberDashboardPage = () => {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Fetch member data on component mount
  useEffect(() => {
    fetchMemberData();
    fetchNotifications();
    setupWebSocket();
  }, []);

  const fetchMemberData = async () => {
    const memberId = localStorage.getItem("member_id");
    if (!memberId) {
      setError("Member ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`members/${memberId}/`);
      setMemberData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching member data:", err);
      setError("Failed to load your profile data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get("member/notifications/");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    }
    setNotifLoading(false);
  };

  const setupWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost =
      import.meta.env.VITE_BACKEND_WS_HOST || "localhost:8001";
    const token = localStorage.getItem("member_access_token");

    if (!token) {
      console.warn("No authentication token found for WebSocket connection");
      return;
    }

    const wsUrl = `${protocol}://${backendHost}/ws/notifications/?token=${token}`;
    let socket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let heartbeatInterval;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("WebSocket connection opened");
          reconnectAttempts = 0;

          heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "ping",
                  timestamp: Date.now(),
                })
              );
            }
          }, 30000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case "connection_established":
                console.log("WebSocket connection established:", data.message);
                break;
              case "notification":
                if (data.notification) {
                  setNotifications((prevNotifs) => {
                    const all = [data.notification, ...prevNotifs];
                    const unique = Array.from(
                      new Map(all.map((n) => [n.id, n])).values()
                    );
                    return unique;
                  });
                }
                break;
              case "pong":
                console.log("Received pong from server");
                break;
              case "error":
                console.error("WebSocket error message:", data.message);
                break;
              default:
                if (data.notification) {
                  setNotifications((prevNotifs) => {
                    const all = [data.notification, ...prevNotifs];
                    const unique = Array.from(
                      new Map(all.map((n) => [n.id, n])).values()
                    );
                    return unique;
                  });
                }
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        socket.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            );
            console.log(
              `Attempting to reconnect in ${delay}ms... (attempt ${
                reconnectAttempts + 1
              }/${maxReconnectAttempts})`
            );

            setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, delay);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (socket) {
        socket.close(1000, "Component unmounting");
      }
    };
  };

  const handleLogout = () => {
    // Clear member session data
    localStorage.removeItem('member_access_token');
    localStorage.removeItem('member_refresh_token');
    localStorage.removeItem('member_user_id');
    localStorage.removeItem('member_username');
    localStorage.removeItem('member_name');
    localStorage.removeItem('member_id');
    localStorage.removeItem('member_isAuthenticated');
    
    // Redirect to login
    navigate('/login');
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    setNotificationError(null);
    try {
      const response = await api.post("notifications/mark_all_read/", {});

      if (response.status === 200) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
      setNotificationError("Failed to mark notifications as read");
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setNotificationError(null);
    try {
      const response = await api.delete("notifications/delete_all/");

      if (response.status === 204) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to delete all notifications", err);
      setNotificationError("Failed to delete notifications");
    } finally {
      setIsDeleting(false);
    }
  };

  // Utility functions
  const getNotifStyle = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes("expiring soon")) {
      return "bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800";
    }
    if (lower.includes("expired")) {
      return "bg-red-50 border-l-4 border-red-400 text-red-800";
    }
    if (lower.includes("membership renewed")) {
      return "bg-green-50 border-l-4 border-green-400 text-green-800";
    }
    return "bg-gray-50 border-l-4 border-gray-300 text-gray-700";
  };

  const getNotifIcon = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes("expiring soon")) return "bx-error-circle";
    if (lower.includes("expired")) return "bx-error-circle";
    if (lower.includes("membership renewed")) return "bx-check-circle";
    return "bx-info-circle";
  };

  const getMembershipStatus = () => {
    if (!memberData?.expiry_date) return "Unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate > today) {
      const daysRemaining = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysRemaining <= 7 ? "Expiring Soon" : "Active";
    } else {
      return "Expired";
    }
  };

  const getDaysRemaining = () => {
    if (!memberData?.expiry_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getDaysSinceJoining = () => {
    if (!memberData?.start_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(memberData.start_date);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  if (loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">
            <i className="bx bx-error-circle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b border-gray-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {memberData?.first_name || "Member"}!
            </h1>
            <p className="text-gray-300">
              Here's your fitness journey overview
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-300 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <i className="bx bx-bell text-2xl"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-600 z-50">
                  <div className="p-4 border-b border-gray-600">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <i className="bx bx-loader-alt animate-spin text-2xl"></i>
                        <p className="mt-2">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <i className="bx bx-bell-off text-4xl mb-2"></i>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            !notification.is_read ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <i
                              className={`bx ${getNotifIcon(
                                notification.message
                              )} text-lg mt-1`}
                            ></i>
                            <div className="flex-1">
                              <p className="text-sm text-gray-800">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between">
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingRead || unreadCount === 0}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {isMarkingRead ? "Marking..." : "Mark all as read"}
                      </button>
                      <button
                        onClick={handleDeleteAll}
                        disabled={isDeleting}
                        className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? "Deleting..." : "Clear all"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-all duration-200"
            >
              <i className="bx bx-log-out mr-2"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Membership Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Membership Status
                </p>
                <p
                  className={`text-lg font-semibold ${
                    getMembershipStatus() === "Active"
                      ? "text-green-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {getMembershipStatus()}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  getMembershipStatus() === "Active"
                    ? "bg-green-100"
                    : getMembershipStatus() === "Expiring Soon"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
              >
                <i
                  className={`bx ${
                    getMembershipStatus() === "Active"
                      ? "bx-check-shield text-green-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "bx-time text-yellow-600"
                      : "bx-error-circle text-red-600"
                  } text-2xl`}
                ></i>
              </div>
            </div>
          </motion.div>

          {/* Days Remaining */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Days Remaining
                </p>
                <p className="text-2xl font-bold text-yellow-400">
                  {getDaysRemaining()}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-calendar text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>

          {/* Membership Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Membership Type
                </p>
                <p className="text-lg font-semibold text-white">
                  {memberData?.membership_type || "Standard"}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-crown text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>

          {/* Member Since */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Member Since
                </p>
                <p className="text-lg font-semibold text-white">
                  {getDaysSinceJoining()} days
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-user-check text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Member Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black text-2xl font-bold">
                {memberData?.first_name?.[0]}
                {memberData?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {memberData?.first_name} {memberData?.last_name}
                </h3>
                <p className="text-gray-300">{memberData?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Phone</span>
                <span className="font-medium text-white">
                  {memberData?.phone || "Not provided"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Join Date</span>
                <span className="font-medium text-white">
                  {formatDate(memberData?.start_date)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300">Expiry Date</span>
                <span
                  className={`font-medium ${
                    getMembershipStatus() === "Expired"
                      ? "text-red-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {formatDate(memberData?.expiry_date)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Membership Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <h3 className="text-xl font-bold text-white mb-6">
              Membership Details
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-calendar text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Monthly Fee
                  </span>
                </div>
                <span className="font-bold text-yellow-400">
                  {memberData?.monthly_fee ? `${memberData.monthly_fee} AFN` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-time text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Time Slot
                  </span>
                </div>
                <span className="font-bold text-yellow-400 capitalize">
                  {memberData?.time_slot || 'Not specified'}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-box text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Box Number
                  </span>
                </div>
                <span className="font-bold text-yellow-400">
                  {memberData?.box_number || 'Not assigned'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Membership Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Membership Progress
          </h3>

          <div className="space-y-6">
            {/* Days Remaining Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-300">Days Remaining</span>
                <span className="text-sm font-bold text-yellow-400">{getDaysRemaining()} days</span>
              </div>
              <div className="w-full bg-gray-600/30 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((getDaysRemaining() / 30) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Membership Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-600 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{getDaysSinceJoining()}</div>
                <div className="text-sm text-gray-300">Days as Member</div>
              </div>
              <div className="text-center p-4 bg-gray-600 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {getMembershipStatus() === 'Active' ? '✓' : getMembershipStatus() === 'Expiring Soon' ? '⚠' : '✗'}
                </div>
                <div className="text-sm text-gray-300">Status</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MemberDashboardPage;
