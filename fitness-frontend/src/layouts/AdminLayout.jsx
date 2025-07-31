import "boxicons/css/boxicons.min.css";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import PageTransitionWrapper from "../components/ui/PageTransitionWrapper";

import useMultiAuth from "../hooks/useMultiAuth";
import api from "../utils/api";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const { authState, logout } = useMultiAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  // Dropdown state
  const [expandedGroups, setExpandedGroups] = useState({
    Members: false,
    "Products & Sales": false,
    Training: false,
    "Manual Shop": false,
  });

  // Set user data from localStorage
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_access_token');
    const adminAuth = localStorage.getItem('admin_isAuthenticated');
    
    if (adminToken && adminAuth === 'true') {
      const userData = {
        name: localStorage.getItem('admin_name'),
        username: localStorage.getItem('admin_username'),
        id: localStorage.getItem('admin_user_id')
      };
      setUserData(userData);
      fetchNotifications();
    }
  }, []);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotificationError(null);
    try {
      const response = await api.get("notifications/admin_notifications/");

      if (response.data && Array.isArray(response.data.notifications)) {
        setNotifications(response.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotificationError("Failed to load notifications");
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleLogout = () => {
    // Clear admin session data
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user_id');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_isAuthenticated');
    
    // Redirect to login
    navigate('/login');
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    try {
      await api.post("notifications/mark_all_read/", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await api.delete("notifications/delete_all/");
      setNotifications([]);
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getActiveTab = () => {
    const path = location.pathname.split("/")[2] || "dashboard";
    return path;
  };

  const activeTab = getActiveTab();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Utility functions for notifications (keep existing)
  const getNotifStyle = (message) => {
    if (
      message.toLowerCase().includes("payment") ||
      message.toLowerCase().includes("due")
    ) {
      return "bg-red-50 border-l-4 border-red-400";
    }
    if (
      message.toLowerCase().includes("support") ||
      message.toLowerCase().includes("help")
    ) {
      return "bg-blue-50 border-l-4 border-blue-400";
    }
    if (
      message.toLowerCase().includes("new member") ||
      message.toLowerCase().includes("joined")
    ) {
      return "bg-green-50 border-l-4 border-green-400";
    }
    return "bg-gray-50 border-l-4 border-gray-400";
  };

  const getNotifIcon = (message) => {
    if (
      message.toLowerCase().includes("payment") ||
      message.toLowerCase().includes("due")
    ) {
      return "bx-error-circle text-red-500";
    }
    if (
      message.toLowerCase().includes("support") ||
      message.toLowerCase().includes("help")
    ) {
      return "bx-help-circle text-blue-500";
    }
    if (
      message.toLowerCase().includes("new member") ||
      message.toLowerCase().includes("joined")
    ) {
      return "bx-user-plus text-green-500";
    }
    return "bx-info-circle text-gray-500";
  };

  // Enhanced sidebar menu items
  const menuItems = [
    {
      title: "Dashboard",
      icon: "bx-home",
      path: "dashboard",
      type: "link",
    },
    {
      title: "Members",
      icon: "bx-user",
      type: "group",
      items: [
        { title: "Register Member", icon: "bx-user-plus", path: "register" },
        { title: "All Members", icon: "bx-group", path: "members" },
        { title: "Attendance", icon: "bx-calendar-check", path: "attendance" },
      ],
    },
    {
      title: "Products & Sales",
      icon: "bx-store",
      type: "group",
      items: [
        { title: "Products", icon: "bx-package", path: "products" },
        { title: "Revenue", icon: "bx-dollar", path: "revenue" },
      ],
    },
    {
      title: "Training",
      icon: "bx-dumbbell",
      type: "group",
      items: [
        { title: "Trainings", icon: "bx-dumbbell", path: "trainings" },
        { title: "Trainers", icon: "bx-user-voice", path: "trainers" },
      ],
    },
    {
      title: "Manual Shop",
      icon: "bx-store-alt",
      type: "group",
      items: [
        { title: "Stock", icon: "bx-plus-circle", path: "stock" },
        { title: "Sale", icon: "bx-minus-circle", path: "sale" },
      ],
    },
    {
      title: "Community",
      icon: "bx-message-square-detail",
      path: "community",
      type: "link",
    },
    {
      title: "Support",
      icon: "bx-help-circle",
      path: "support",
      type: "link",
    },
    {
      title: "Settings",
      icon: "bx-cog",
      path: "adminsettings",
      type: "link",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex justify-between items-center shadow-lg z-40">
        <h1 className="text-xl font-bold text-white">Admin Portal</h1>
        <button
          onClick={toggleSidebar}
          className="text-white focus:outline-none transition-transform hover:scale-110"
        >
          <i className={`bx ${sidebarOpen ? "bx-x" : "bx-menu"} text-3xl`}></i>
        </button>
      </div>

      {/* Sidebar - Keep your existing sidebar JSX but remove the auth loading logic */}
      <div
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:w-72 bg-gradient-to-b from-gray-700 to-gray-900 text-white flex flex-col
        transform transition-all duration-300 ease-in-out
        fixed lg:relative z-30 h-full lg:h-auto
        w-80 shadow-2xl
      `}
      >
        {/* Sidebar Header */}
        <div className="p-6 pb-4 relative">
          <div className="absolute top-0 left-0 w-full bg-gray-900"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
              <i className="bx bx-shield-alt-2 text-2xl text-black"></i>
            </div>
            <div>
              <h1 className="text-md font-bold">Admin Dashboard</h1>
              <p className="text-xs text-gray-400">
                {userData?.email || "Administrator"}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            if (item.type === "link") {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(`/admin/${item.path}`)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                    activeTab === item.path
                      ? "bg-yellow-500 text-black shadow-md"
                      : "text-gray-300 hover:bg-gray-700/50"
                  }`}
                >
                  <i className={`bx ${item.icon} mr-3 text-xl`}></i>
                  <span className="font-medium">{item.title}</span>
                </button>
              );
            } else if (item.type === "group") {
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <i className={`bx ${item.icon} mr-3 text-xl`}></i>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <i
                      className={`bx bx-chevron-down transition-transform ${
                        expandedGroups[item.title] ? "rotate-180" : ""
                      }`}
                    ></i>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedGroups[item.title]
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-6 mt-2 space-y-1">
                      {item.items.map((subItem) => (
                        <button
                          key={subItem.path}
                          onClick={() => navigate(`/admin/${subItem.path}`)}
                          className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-all duration-200 ${
                            activeTab === subItem.path
                              ? "bg-yellow-500 text-black shadow-sm"
                              : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
                          }`}
                        >
                          <i className={`bx ${subItem.icon} mr-3 text-sm`}></i>
                          <span className="text-sm">{subItem.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-red-200 hover:text-white bg-red-900/30 hover:bg-red-800/30 rounded-lg transition-all duration-200"
          >
            <i className="bx bx-log-out mr-3 text-xl"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-yellow-400 capitalize">
              {activeTab.replace(/([A-Z])/g, " $1").trim()}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBellClick}
                className="relative p-3 text-yellow-400 hover:text-yellow-500 hover:bg-gray-700 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
              >
                <div className="relative">
                  <i
                    className={`bx ${
                      unreadCount > 0 ? "bx-bell bx-tada" : "bx-bell"
                    } text-2xl`}
                  ></i>
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                      <span className="absolute -top-1 -right-1 bg-red-400 rounded-full h-3 w-3 animate-ping"></span>
                    </>
                  )}
                </div>
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 z-50 overflow-hidden backdrop-blur-sm"
                  >
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 sm:p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <div className="p-2 bg-black/20 rounded-lg flex-shrink-0">
                            <i className="bx bx-bell text-black text-lg sm:text-xl"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-black truncate">
                              Notifications
                            </h3>
                            <p className="text-black/80 text-xs sm:text-sm truncate">
                              {unreadCount} unread
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                          <button
                            onClick={handleMarkAllAsRead}
                            disabled={
                              isMarkingRead || notifications.length === 0
                            }
                            className="px-2 sm:px-3 py-1 bg-black/20 text-black text-xs rounded-lg hover:bg-black/30 disabled:opacity-50 transition-all duration-200"
                          >
                            {isMarkingRead ? "Marking..." : "Mark all"}
                          </button>
                          <button
                            onClick={handleDeleteAll}
                            disabled={isDeleting || notifications.length === 0}
                            className="px-2 sm:px-3 py-1 bg-red-500/80 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-200"
                          >
                            {isDeleting ? "Deleting..." : "Clear"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto bg-gray-700">
                      {notifLoading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent mx-auto"></div>
                          <p className="text-sm text-gray-300 mt-3 font-medium">
                            Loading notifications...
                          </p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="bx bx-bell-off text-2xl text-gray-400"></i>
                          </div>
                          <p className="text-sm text-white font-medium">
                            No notifications
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            You're all caught up!
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className={`p-3 sm:p-4 border-b border-gray-600/50 hover:bg-gray-600 transition-all duration-200 ${
                              !notification.is_read
                                ? "bg-yellow-500/20 border-l-4 border-l-yellow-500"
                                : "bg-gray-700"
                            }`}
                          >
                            <div className="flex items-start space-x-2 sm:space-x-4">
                              <div
                                className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                  !notification.is_read
                                    ? "bg-yellow-500"
                                    : "bg-gray-600"
                                }`}
                              >
                                <i
                                  className={`bx ${getNotifIcon(
                                    notification.message
                                  )} text-sm sm:text-lg ${
                                    !notification.is_read
                                      ? "text-black"
                                      : "text-yellow-400"
                                  }`}
                                ></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs sm:text-sm leading-relaxed break-words ${
                                    !notification.is_read
                                      ? "text-white font-medium"
                                      : "text-gray-300"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 sm:mt-2 flex items-center">
                                  <i className="bx bx-time-five mr-1 flex-shrink-0"></i>
                                  <span className="truncate">
                                    {new Date(
                                      notification.created_at
                                    ).toLocaleString()}
                                  </span>
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                    <div className="p-3 bg-gray-800 border-t border-gray-600">
                      <div className="text-center">
                        <button className="text-xs text-gray-300 hover:text-yellow-500 font-medium transition-colors duration-200">
                          View all notifications
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-semibold">
                {userData?.name?.[0] || "A"}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">
                  {userData?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-300">Administrator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          <div className="h-full overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <PageTransitionWrapper>
                <Outlet />
              </PageTransitionWrapper>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default AdminLayout;
