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
    <div className="bg-gray-800 shadow-sm border-b border-gray-600 px-6 py-4 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-yellow-500">
            Welcome back, {loading ? "..." : memberData?.first_name || "Member"}
            !
          </h1>
          <p className="text-gray-300">Here's your fitness journey overview</p>
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
                  {notifications.length === 0 ? (
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
            className="flex items-center px-4 py-2 text-red-400 bg-red-900/30 hover:bg-red-700/30 rounded-lg transition-all duration-200"
          >
            <i className="bx bx-log-out mr-2"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MemberHeader;
