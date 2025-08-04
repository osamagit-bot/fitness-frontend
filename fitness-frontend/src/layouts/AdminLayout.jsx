import "boxicons/css/boxicons.min.css";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import PageTransitionWrapper from "../components/ui/PageTransitionWrapper";

import useMultiAuth from "../hooks/useMultiAuth";
import api from "../utils/api";

// Context for dashboard data
const DashboardContext = createContext();
export const useDashboard = () => useContext(DashboardContext);

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const { authState, logout } = useMultiAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // Dashboard context state
  const [dashboardStats, setDashboardStats] = useState({
    activeMembers: 0,
    lastUpdate: new Date()
  });

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

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleBellClick = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

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

  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingRead(true);
    try {
      await api.post("notifications/mark_all_read/", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setIsMarkingRead(false);
    }
  }, []);

  const handleDeleteAll = useCallback(async () => {
    setIsDeleting(true);
    try {
      await api.delete("notifications/delete_all/");
      setNotifications([]);
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const getActiveTab = () => {
    const path = location.pathname.split("/")[2] || "dashboard";
    return path;
  };

  const activeTab = getActiveTab();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickOutside = 
        (dropdownRef.current && !dropdownRef.current.contains(event.target)) &&
        (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target));
      
      if (isClickOutside) {
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

  // Memoize dashboard context value to prevent unnecessary re-renders
  const dashboardContextValue = useMemo(() => ({
    dashboardStats,
    setDashboardStats
  }), [dashboardStats]);

  return (
    <DashboardContext.Provider value={dashboardContextValue}>
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-b from-gray-700 to-gray-800 relative overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex justify-between items-center shadow-lg z-40">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            className="text-yellow-500 hover:text-yellow-400 focus:outline-none transition-transform hover:scale-110"
            style={{ color: '#eab308' }}
          >
            <i className={`bx ${sidebarOpen ? "bx-x" : "bx-menu"} text-3xl text-yellow-500 hover:text-yellow-400`} style={{ color: '#eab308' }}></i>
          </button>
          <h1 className="text-xl font-bold text-white">Admin Portal</h1>
        </div>
        
        {/* Mobile Notifications and Profile */}
        <div className="flex items-center space-x-2">
          {/* Mobile Notifications */}
          <div className="relative" ref={mobileDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBellClick();
              }}
              className="relative p-2 text-yellow-400 hover:text-yellow-500 hover:bg-gray-700 rounded-lg transition-all duration-300"
            >
              <i className={`bx ${unreadCount > 0 ? "bx-bell bx-tada" : "bx-bell"} text-xl`}></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
            {/* Mobile Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 z-50 overflow-hidden backdrop-blur-sm"
                >
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="p-2 bg-black/20 rounded-lg flex-shrink-0">
                          <i className="bx bx-bell text-black text-lg"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-black truncate">
                            Notifications
                          </h3>
                          <p className="text-black/80 text-xs truncate">
                            {unreadCount} unread
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        <button
                          onClick={handleMarkAllAsRead}
                          disabled={
                            isMarkingRead || notifications.length === 0
                          }
                          className="px-2 py-1 bg-black/20 text-black text-xs rounded-lg hover:bg-black/30 disabled:opacity-50 transition-all duration-200"
                        >
                          {isMarkingRead ? "Marking..." : "Mark all"}
                        </button>
                        <button
                          onClick={handleDeleteAll}
                          disabled={isDeleting || notifications.length === 0}
                          className="px-2 py-1 bg-red-500/80 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all duration-200"
                        >
                          {isDeleting ? "Deleting..." : "Clear"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto bg-gray-700">
                    {notifLoading ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-500 border-t-transparent mx-auto"></div>
                        <p className="text-sm text-gray-300 mt-2 font-medium">
                          Loading notifications...
                        </p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="bx bx-bell-off text-xl text-gray-400"></i>
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
                          className={`p-3 border-b border-gray-600/50 hover:bg-gray-600 transition-all duration-200 ${
                            !notification.is_read
                              ? "bg-yellow-500/20 border-l-4 border-l-yellow-500"
                              : "bg-gray-700"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-1.5 rounded-lg flex-shrink-0 ${
                                !notification.is_read
                                  ? "bg-yellow-500"
                                  : "bg-gray-600"
                              }`}
                            >
                              <i
                                className={`bx ${getNotifIcon(
                                  notification.message
                                )} text-sm ${
                                  !notification.is_read
                                    ? "text-black"
                                    : "text-yellow-400"
                                }`}
                              ></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs leading-relaxed break-words ${
                                  !notification.is_read
                                    ? "text-white font-medium"
                                    : "text-gray-300"
                                }`}
                              >
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 flex items-center">
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
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-gray-800 border-t border-gray-600">
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
          
          {/* Mobile User Profile */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-semibold text-sm">
            {userData?.name?.[0] || "A"}
          </div>
        </div>
      </div>

      {/* Enhanced Sidebar */}
      <div
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-80'} bg-gradient-to-b from-gray-700 to-gray-800 text-white flex flex-col
        transform transition-all duration-500 ease-in-out
        fixed lg:relative z-30 h-full
        ${sidebarCollapsed ? 'w-20' : 'w-80'} shadow-2xl border-r border-gray-700
      `}
      >
        {/* Enhanced Sidebar Header */}
        <div className="p-6 pb-4 relative bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5"></div>
          <div className="relative z-10">
            {/* Collapse Toggle Button */}
            <div className="flex justify-end mb-3">
              <button
                onClick={toggleSidebarCollapse}
                className="p-2 text-gray-300 hover:text-yellow-400 hover:bg-gray-700/50 rounded-lg transition-all duration-300 transform hover:scale-110"
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <i className={`bx ${sidebarCollapsed ? 'bx-chevrons-right' : 'bx-chevrons-left'} text-xl`}></i>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <i className="bx bx-shield-alt-2 text-2xl text-black"></i>
              </div>
              {!sidebarCollapsed && (
                <div className="transition-all duration-300">
                  <h1 className="text-lg font-bold text-white">Admin Portal</h1>
                  <p className="text-sm text-gray-300 flex items-center">
                    <i className="bx bx-user text-xs mr-1"></i>
                    {userData?.name || "Administrator"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Sidebar Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1" style={{height: 'calc(100vh - 160px)', overflowY: 'hidden'}}>
          {/* Enhanced Menu Items */}
          <div className="space-y-1 h-full">
            {menuItems.map((item, index) => {
              if (item.type === "link") {
                return (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    onClick={() => navigate(`/admin/${item.path}`)}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-left rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      activeTab === item.path
                        ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg scale-105"
                        : "text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-yellow-500 hover:scale-102"
                    }`}
                    title={sidebarCollapsed ? item.title : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <i className={`bx ${item.icon} ${sidebarCollapsed ? '' : 'mr-4'} text-xl relative z-10 ${activeTab === item.path ? 'animate-pulse text-black' : 'text-yellow-500'}`}></i>
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium relative z-10">{item.title}</span>
                        {activeTab === item.path && (
                          <div className="absolute right-3 w-2 h-2 bg-black rounded-full animate-pulse"></div>
                        )}
                      </>
                    )}
                  </motion.button>
                );
              } else if (item.type === "group") {
                if (sidebarCollapsed) {
                  // When collapsed, show a simplified icon-only button for groups
                  return (
                    <motion.button
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      onClick={() => {
                        // Navigate to first item in group when collapsed
                        if (item.items && item.items.length > 0) {
                          navigate(`/admin/${item.items[0].path}`);
                        }
                      }}
                      className="w-full flex items-center justify-center px-2 py-3 text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-yellow-500 rounded-xl transition-all duration-300 group relative overflow-hidden"
                      title={item.title}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <i className={`bx ${item.icon} text-xl relative z-10 text-yellow-500`}></i>
                    </motion.button>
                  );
                }
                
                return (
                  <motion.div 
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="relative"
                  >
                    <button
                      onClick={() => toggleGroup(item.title)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-yellow-500 rounded-xl transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="flex items-center relative z-10">
                        <i className={`bx ${item.icon} mr-4 text-xl text-yellow-500`}></i>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <i
                        className={`bx bx-chevron-down transition-all duration-300 relative z-10 text-yellow-500 ${
                          expandedGroups[item.title] ? "rotate-180 text-yellow-400" : ""
                        }`}
                      ></i>
                    </button>
                    
                    <AnimatePresence>
                      {expandedGroups[item.title] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-700 pl-4">
                            {item.items.map((subItem, subIndex) => (
                              <motion.button
                                key={subItem.path}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: subIndex * 0.1, duration: 0.3 }}
                                onClick={() => navigate(`/admin/${subItem.path}`)}
                                className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-300 group relative overflow-hidden ${
                                  activeTab === subItem.path
                                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-md transform scale-105"
                                    : "text-gray-400 hover:bg-gray-700/50 hover:text-yellow-500 hover:transform hover:translate-x-1"
                                }`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <i className={`bx ${subItem.icon} mr-3 text-lg relative z-10 ${activeTab === subItem.path ? 'text-black' : 'text-yellow-500'}`}></i>
                                <span className="text-sm font-medium relative z-10">{subItem.title}</span>
                                {activeTab === subItem.path && (
                                  <div className="absolute right-3 w-2 h-2 bg-black rounded-full animate-pulse"></div>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }
              return null;
            })}
          </div>
        </nav>

        {/* Enhanced Logout Button */}
        <div className="p-3 border-t border-gray-700">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-red-200 hover:text-white bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-800/60 hover:to-red-700/60 rounded-xl transition-all duration-300 group relative overflow-hidden border border-red-800/30`}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <i className={`bx bx-log-out ${sidebarCollapsed ? '' : 'mr-3'} text-xl relative z-10 group-hover:animate-pulse`}></i>
            {!sidebarCollapsed && (
              <>
                <span className="font-medium relative z-10">Logout</span>
                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <i className="bx bx-exit text-sm"></i>
                </div>
              </>
            )}
          </motion.button>
        </div>
      </div>



      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden pt-20 lg:pt-0">
        {/* Top Header */}
        <div className={`bg-gray-800 shadow-sm border-b border-gray-600 px-6 relative ${activeTab === 'dashboard' ? 'py-4' : 'py-6'}`}>
          {activeTab === 'dashboard' ? (
            /* Dashboard Header */
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gray-600/20 backdrop-blur-lg"></div>
              <div className="relative">
                <div className="flex flex-col gap-4 md:pb-0 md:pr-32 md:flex-row md:justify-between md:items-center md:gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                        <i className="bx bx-stats text-xl sm:text-2xl text-black"></i>
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                          Atalan Fitness Dashboard
                        </h1>
                        <p className="text-gray-400 text-xs sm:text-sm font-medium">
                          Real-time insights and analytics
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Live • Last updated: {dashboardStats.lastUpdate.toLocaleString()}</span>
                    </div>
                  </div>

               
               
                </div>
              </div>
            </div>
          ) : (
            /* Default Header for other pages */
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-yellow-400 capitalize">
                  {activeTab.replace(/([A-Z])/g, " $1").trim()}
                </h2>
              </div>
            </div>
          )}
          
          {/* Right side content - notifications and user profile - Hidden on mobile, always positioned on the right on larger screens */}
          <div className={`hidden lg:flex absolute ${activeTab === 'dashboard' ? 'top-4 right-4 md:right-6' : 'top-6 right-6'} items-center space-x-3 z-10`}>
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBellClick();
                }}
                className="relative p-2 md:p-3 text-yellow-400 hover:text-yellow-500 hover:bg-gray-700 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
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
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-semibold text-sm md:text-base">
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
    </DashboardContext.Provider>
  );
}

export default AdminLayout;
