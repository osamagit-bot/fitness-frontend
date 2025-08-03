import "boxicons/css/boxicons.min.css";
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function MemberHeader({ memberData, notifications, setNotifications, loading }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('member_access_token');
    localStorage.removeItem('member_refresh_token');
    localStorage.removeItem('member_user_id');
    localStorage.removeItem('member_username');
    localStorage.removeItem('member_name');
    localStorage.removeItem('member_id');
    localStorage.removeItem('member_isAuthenticated');
    navigate('/login');
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    try {
      const response = await api.post("notifications/mark_all_read/", {});
      if (response.status === 200) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete("notifications/delete_all/");
      if (response.status === 204) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification.message);
    console.log('Navigation link:', notification.link || getNotificationLink(notification.message));
    
    // Mark as read if not already
    if (!notification.is_read) {
      // Update locally first
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? {...n, is_read: true} : n)
      );
      
      // Update in database
      try {
        await api.patch(`notifications/${notification.id}/`, { is_read: true });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    
    // Navigate to the appropriate page
    const link = notification.link || getNotificationLink(notification.message);
    navigate(link);
    setShowNotifications(false);
  };

  const getNotificationLink = (message) => {
    const lower = message.toLowerCase();
    
    // Community related
    if (lower.includes('post') && (lower.includes('published') || lower.includes('liked') || lower.includes('commented'))) {
      return '/member-dashboard/community';
    }
    if (lower.includes('challenge')) {
      return '/member-dashboard/community';
    }
    if (lower.includes('announcement') || lower.includes('new announcement')) {
      return '/member-dashboard/community';
    }
    
    // Support related
    if (lower.includes('support ticket') || lower.includes('ticket')) {
      return '/member-dashboard/support';
    }
    
    // Attendance related
    if (lower.includes('checked in') || lower.includes('checked out')) {
      return '/member-dashboard/attendance';
    }
    
    // Account/Settings related
    if (lower.includes('password') || lower.includes('profile') || lower.includes('account')) {
      return '/member-dashboard/settings';
    }
    
    // Membership related
    if (lower.includes('membership') || lower.includes('renewed')) {
      return '/member-dashboard';
    }
    
    // Purchase related
    if (lower.includes('purchase')) {
      return '/member-dashboard';
    }
    
    // Default
    return '/member-dashboard';
  };

  const getNotifIcon = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes("expiring soon")) return "bx-error-circle";
    if (lower.includes("expired")) return "bx-error-circle";
    if (lower.includes("membership renewed")) return "bx-check-circle";
    return "bx-info-circle";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-gray-800 shadow-sm border-b border-gray-600 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-yellow-500 truncate">
            Welcome back, {loading ? "..." : memberData?.first_name || "Member"}
            !
          </h1>
          <p className="text-sm sm:text-base text-gray-300 hidden sm:block">Here's your fitness journey overview</p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
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
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-600 z-50">
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

                <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 sm:p-6 text-center text-gray-500">
                      <i className="bx bx-bell-off text-3xl sm:text-4xl mb-2"></i>
                      <p className="text-sm sm:text-base">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 sm:p-4 border-b border-gray-600 hover:bg-gray-700 transition-colors cursor-pointer ${
                          !notification.is_read ? "bg-gray-700/50" : ""
                        }`}
                      >
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <i
                            className={`bx ${getNotifIcon(
                              notification.message
                            )} text-base sm:text-lg mt-1 text-yellow-400`}
                          ></i>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-white break-words">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-amber-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 sm:p-3 bg-gray-700 border-t border-gray-600 flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingRead || unreadCount === 0}
                      className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed text-center sm:text-left"
                    >
                      {isMarkingRead ? "Marking..." : "Mark all as read"}
                    </button>
                    <button
                      onClick={handleDeleteAll}
                      disabled={isDeleting}
                      className="text-xs sm:text-sm text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed text-center sm:text-right"
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
            className="flex items-center px-2 sm:px-4 py-2 text-red-400 bg-red-900/30 hover:bg-red-700/30 rounded-lg transition-all duration-200"
          >
            <i className="bx bx-log-out sm:mr-2"></i>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MemberHeader;
