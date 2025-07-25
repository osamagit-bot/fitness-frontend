// src/SubPages/MemberPages/MemberDashboardPage.jsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

import 'boxicons/css/boxicons.min.css';
import { useRef } from 'react';

const getNotifStyle = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('expiring soon')) {
    return 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800';
  }
  if (lower.includes('expired')) {
    return 'bg-red-50 border-l-4 border-red-400 text-red-800';
  }
  if (lower.includes('membership renewed')) {
    return 'bg-green-50 border-l-4 border-green-400 text-green-800';
  }
  return 'bg-gray-50 border-l-4 border-gray-300 text-gray-700';
};

const getNotifIcon = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('expiring soon')) return 'bx-error-circle';
  if (lower.includes('expired')) return 'bx-error-circle';
  if (lower.includes('membership renewed')) return 'bx-check-circle';
  return 'bx-info-circle';
};

const MemberDashboardPage = () => {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [memberNotifications, setMemberNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const memberId = localStorage.getItem('memberId') || '';

  const token = localStorage.getItem('access_token');
  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
     

        const response = await api.get(`members/${memberId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setMemberData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching member data:', err);
        setError('Failed to load your profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberData();
    } else {
      setLoading(false);
    }
  }, [memberId]);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await api.get('member/notifications/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setNotifications([
        {
          id: 0,
          message: 'Failed to load notifications',
          created_at: '',
          is_read: true
        }
      ]);
    }
    setNotifLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const user = localStorage.getItem('user');

      if (!token || isAuthenticated !== 'true') {
        navigate('/login');
      } else {
        try {
          setUserData(user ? JSON.parse(user) : null);
          setAuthChecked(true);
          fetchNotifications();

          // WebSocket setup for notifications with auto-reconnect
          const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const backendHost = import.meta.env.VITE_BACKEND_WS_HOST || 'localhost:8001';
          const token = localStorage.getItem('access_token');
          
          if (!token) {
            console.warn('No authentication token found for WebSocket connection');
            return;
        }

          const wsUrl = `${protocol}://${backendHost}/ws/notifications/?token=${token}`;
          let socket;
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 5;
          const reconnectDelay = 1000; // Start with 1 second delay
        let heartbeatInterval;

          const connectWebSocket = () => {
          try {
          socket = new WebSocket(wsUrl);
          
          socket.onopen = () => {
          console.log('WebSocket connection opened');
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          
          // Start heartbeat to keep connection alive
          heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
              }));
            }
          }, 30000); // Send ping every 30 seconds
          };

          socket.onmessage = (event) => {
          try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
          case 'connection_established':
          console.log('WebSocket connection established:', data.message);
          break;
          case 'notification':
              if (data.notification) {
                  setNotifications((prevNotifs) => {
                  const all = [data.notification, ...prevNotifs];
                    const unique = Array.from(new Map(all.map(n => [n.id, n])).values());
                      return unique;
                      });
                    }
                    break;
                  case 'pong':
                    console.log('Received pong from server');
                    break;
                  case 'error':
                    console.error('WebSocket error message:', data.message);
                    break;
                  default:
                    // Legacy support for old format
                    if (data.notification) {
                      setNotifications((prevNotifs) => {
                        const all = [data.notification, ...prevNotifs];
                        const unique = Array.from(new Map(all.map(n => [n.id, n])).values());
                        return unique;
                      });
                    }
                }
              } catch (err) {
                console.error('Error parsing WebSocket message:', err);
              }
            };

              socket.onclose = (event) => {
              console.log('WebSocket connection closed:', event.code, event.reason);
              
              // Clear heartbeat interval
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              
              // Attempt to reconnect if not manually closed
              if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30 seconds
                console.log(`Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                
                setTimeout(() => {
                  reconnectAttempts++;
                  connectWebSocket();
                }, delay);
              }
            };

            socket.onerror = (error) => {
              console.error('WebSocket error:', error);
            };
          } catch (error) {
            console.error('Error creating WebSocket connection:', error);
          }
        };

        // Initial connection
        connectWebSocket();

        // Cleanup on unmount
        return () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          if (socket) {
            socket.close(1000, 'Component unmounting'); // Normal closure
          }
        };
        } catch (error) {
          console.error('Error parsing user data:', error);
          navigate('/login');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    // Auto-resize sidebar
    const handleResize = () => {
      // Removed setSidebarOpen call because it is not defined in this component
      // You can implement sidebar state management if needed
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);

  // Filter notifications related to member info
  useEffect(() => {
    if (!memberData) {
      setMemberNotifications([]);
      return;
    }
    setMemberNotifications(notifications);
  }, [notifications, memberData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('memberId');
    navigate('/login');
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    setNotificationError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.post(
        'notifications/mark_all_read/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setMemberNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
      setNotificationError('Failed to mark notifications as read');
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setNotificationError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.delete(
        'notifications/delete_all/',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 204) {
        setNotifications([]);
        setMemberNotifications([]);
      }
    } catch (err) {
      console.error('Failed to delete all notifications', err);
      setNotificationError('Failed to delete notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const getMembershipStatus = () => {
    if (!memberData?.expiry_date) return 'Unknown';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate > today) {
      const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 7 ? 'Expiring Soon' : 'Active';
    } else {
      return 'Expired';
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeSlot = (slot) => {
    if (!slot) return 'Not specified';
    return slot.charAt(0).toUpperCase() + slot.slice(1);
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const membershipStatus = memberData ? getMembershipStatus() : 'Unknown';
  const daysRemaining = getDaysRemaining();
  const daysSinceJoining = getDaysSinceJoining();
  const statusColorClass = getStatusColorClass(membershipStatus);

  const unreadCount = memberNotifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Elite Fitness Club
            </h1>
            <p className="text-sm text-gray-600">Member Portal</p>
          </div>
          <div className="flex items-center space-x-4 relative">
            {/* Notification Bell */}
            <button
              className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors relative"
              onClick={handleBellClick}
            >
              <i className="bx bx-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition"
            >
              <i className="bx bx-log-out"></i>
              Logout
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div ref={dropdownRef} className="absolute right-0 top-14 bg-white shadow-xl rounded-lg w-96 z-50 border border-gray-200 overflow-hidden">
                <div className="sticky top-0 bg-white z-10 p-4 border-b font-semibold text-gray-700 flex justify-between items-center">
                  Notifications
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label="Close notifications"
                  >
                    <i className="bx bx-x text-lg"></i>
                  </button>
                </div>

                <div className="p-3 border-b flex justify-between">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    disabled={unreadCount === 0 || isMarkingRead}
                  >
                    {isMarkingRead ? 'Processing...' : 'Mark all as read'}
                  </button>

                  <button
                    onClick={handleDeleteAll}
                    className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    disabled={memberNotifications.length === 0 || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete all'}
                  </button>
                </div>

                {notificationError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm">
                    {notificationError}
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto">
                  {notifLoading ? (
                    <div className="animate-pulse p-4 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : memberNotifications.length === 0 ? (
                    <div className="p-4 text-gray-500">No notifications</div>
                  ) : (
                    memberNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-4 border-b ${getNotifStyle(notif.message)} ${!notif.is_read ? 'font-semibold' : ''}`}
                      >
                        <i className={`bx ${getNotifIcon(notif.message)} text-xl mt-1`}></i>
                        <div className="flex-1">
                          <div>{notif.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
        >
          <p>{error}</p>
        </motion.div>
      ) : (
        <>
          {/* Welcome and Status */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, {memberData?.first_name || 'Member'}
              </h1>
              <p className="text-gray-600 mt-1">
                Member ID: <span className="font-semibold">{memberData?.athlete_id || 'N/A'}</span>
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${statusColorClass}`}>
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    membershipStatus === 'Active'
                      ? 'bg-green-500'
                      : membershipStatus === 'Expiring Soon'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span className="font-medium">{membershipStatus}</span>
              </div>
            </div>
          </motion.div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-xl shadow-md border border-yellow-200 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Membership Type</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800 capitalize">
                  {memberData?.membership_type || 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Monthly Fee</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {memberData?.monthly_fee
                    ? `${parseFloat(memberData.monthly_fee).toFixed(2)} AFN`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Time Slot</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {formatTimeSlot(memberData?.time_slot)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Days as Member</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {daysSinceJoining} {daysSinceJoining === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Member Info & Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Membership Status */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Membership Status
              </h2>
              <div className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div
                    className={`p-2 ${
                      membershipStatus === 'Active'
                        ? 'bg-green-100 text-green-600'
                        : membershipStatus === 'Expiring Soon'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                    } rounded-md mr-3`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Status</p>
                    <p className="text-lg font-medium">{membershipStatus}</p>
                  </div>
                </div>

                {/* Start/Expiry Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-lg font-medium">{formatDate(memberData?.start_date)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Expiry Date</p>
                    <p className="text-lg font-medium">{formatDate(memberData?.expiry_date)}</p>
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Days Remaining</p>
                  <p className="text-lg font-medium">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</p>
                </div>

                {membershipStatus === 'Expired' && (
                  <div className="mt-4">
                    <a
                      href="/contact"
                      className="w-full inline-block text-center bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg shadow transition-colors"
                    >
                      Contact Admin to Renew
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Member Info */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Member Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-lg font-medium">
                      {memberData?.first_name || ''} {memberData?.last_name || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Box Number</p>
                    <p className="text-lg font-medium">{memberData?.box_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Time Slot</p>
                    <p className="text-lg font-medium">{formatTimeSlot(memberData?.time_slot)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monthly Fee</p>
                    <p className="text-lg font-medium">{memberData?.monthly_fee || 'N/A'} AFN</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Biometric Status</p>
                  <p className="text-lg font-medium">
                    {memberData?.biometric_registered ? 'Registered' : 'Not Registered'}
                  </p>
                </div>

                <div className="mt-4">
                  <a
                    href="/member-dashboard/profile"
                    className="w-full inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg shadow transition-colors"
                  >
                    View Full Profile
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default MemberDashboardPage;
