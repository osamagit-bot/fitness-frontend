import "boxicons/css/boxicons.min.css";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import PageTransitionWrapper from "../components/ui/PageTransitionWrapper";
import api from "../services/api";

// Utility functions for notifications
const getNotifStyle = (message) => {
  if (message.toLowerCase().includes('payment') || message.toLowerCase().includes('due')) {
    return 'bg-red-50 border-l-4 border-red-400';
  }
  if (message.toLowerCase().includes('support') || message.toLowerCase().includes('help')) {
    return 'bg-blue-50 border-l-4 border-blue-400';
  }
  if (message.toLowerCase().includes('new member') || message.toLowerCase().includes('joined')) {
    return 'bg-green-50 border-l-4 border-green-400';
  }
  return 'bg-gray-50 border-l-4 border-gray-400';
};

const getNotifIcon = (message) => {
  if (message.toLowerCase().includes('payment') || message.toLowerCase().includes('due')) {
    return 'bx-error-circle text-red-500';
  }
  if (message.toLowerCase().includes('support') || message.toLowerCase().includes('help')) {
    return 'bx-help-circle text-blue-500';
  }
  if (message.toLowerCase().includes('new member') || message.toLowerCase().includes('joined')) {
    return 'bx-user-plus text-green-500';
  }
  return 'bx-info-circle text-gray-500';
};

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  // Dropdown state - all collapsed by default
  const [expandedGroups, setExpandedGroups] = useState({
    'Members': false,
    'Products & Sales': false,
    'Training': false
  });

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotificationError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get(
        'notifications/admin_notifications/',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && Array.isArray(response.data.notifications)) {
        setNotifications(response.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotificationError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    try {
      const token = localStorage.getItem('access_token');
      await api.post(
        'notifications/mark_all_read/',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      await api.delete(
        'notifications/delete_all/',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([]);
    } catch (err) {
      console.error('Failed to delete all notifications', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getActiveTab = () => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    return path;
  };

  const activeTab = getActiveTab();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 AdminLayout: Checking authentication...');
        const token = localStorage.getItem('access_token');
        const userType = localStorage.getItem('userType');
        
        console.log('🔑 Token exists:', !!token);
        console.log('👤 User type:', userType);
        
        if (!token || userType !== 'admin') {
          console.log('❌ AdminLayout: No valid admin token, redirecting to login');
          navigate('/login');
          return;
        }

        // Test the token with a simple endpoint
        const response = await api.get('auth-test/check/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ AdminLayout: Auth check successful');
        setUserData({ name: localStorage.getItem('name'), email: localStorage.getItem('username') });
        setAuthChecked(true);
      } catch (error) {
        console.error('❌ AdminLayout: Auth check failed:', error);
        console.log('🧹 Clearing localStorage and redirecting...');
        localStorage.clear();
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (authChecked) {
      fetchNotifications();
    }
  }, [authChecked]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Enhanced sidebar menu items with submenus and icons
  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'bx-home',
      path: 'dashboard',
      type: 'link'
    },
    {
      title: 'Members',
      icon: 'bx-user',
      type: 'group',
      items: [
        { title: 'Register Member', icon: 'bx-user-plus', path: 'register' },
        { title: 'All Members', icon: 'bx-group', path: 'members' },
        { title: 'Attendance', icon: 'bx-calendar-check', path: 'attendance' },
      ]
    },
    {
      title: 'Products & Sales',
      icon: 'bx-store',
      type: 'group',
      items: [
        { title: 'Products', icon: 'bx-package', path: 'products' },
        { title: 'Revenue', icon: 'bx-dollar', path: 'revenue' },
      ]
    },
    {
      title: 'Training',
      icon: 'bx-dumbbell',
      type: 'group',
      items: [
        { title: 'Trainings', icon: 'bx-dumbbell', path: 'trainings' },
        { title: 'Trainers', icon: 'bx-user-voice', path: 'trainers' },
      ]
    },
    {
      title: 'Community',
      icon: 'bx-message-square-detail',
      path: 'community',
      type: 'link'
    },
    {
      title: 'Support',
      icon: 'bx-help-circle',
      path: 'support',
      type: 'link',
      badge: 'New'
    },
    {
      title: 'Settings',
      icon: 'bx-cog',
      path: 'adminsettings',
      type: 'link'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex justify-between items-center shadow-lg z-40">
        <h1 className="text-xl font-bold text-white">Admin Portal</h1>
        <button
          onClick={toggleSidebar}
          className="text-white focus:outline-none transition-transform hover:scale-110"
        >
          <i className={`bx ${sidebarOpen ? "bx-x" : "bx-menu"} text-3xl`}></i>
        </button>
      </div>

      {/* Enhanced Sidebar */}
      <div
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:w-72 bg-gradient-to-b  from-indigo-800 to-blue-900 text-white flex flex-col
        transform transition-all duration-300 ease-in-out
        fixed lg:relative z-30 h-full lg:h-auto
        w-80 shadow-2xl
      `}
      >
        {/* Sidebar Header */}
        <div className="p-6 pb-4 border-b border-blue-700 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-900/30 to-indigo-900/30"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
              <i className="bx bx-shield-alt-2 text-2xl"></i>
            </div>
            <div>
              <h1 className="text-md font-bold">Admin Dashboard</h1>
              <p className="text-xs text-blue-200">
                {userData?.email || "Administrator"}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Search (optional) */}
        <div className="px-4 py-3 border-b border-blue-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu..."
              className="w-full bg-blue-900/50 border border-blue-700 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <i className="bx bx-search absolute left-3 top-2.5 text-blue-300"></i>
          </div>
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 pt-5 overflow-y-auto custom-scrollbar py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.title}>
                {item.type === 'group' ? (
                  // Group with dropdown
                  <div>
                    <button
                      onClick={() => toggleGroup(item.title)}
                      className={`
                        w-full text-left px-4 py-3 rounded-lg transition-all
                        hover:bg-blue-700/50 hover:shadow-md
                        bg-transparent
                        flex items-center justify-between
                      `}
                    >
                      <div className="flex items-center">
                        <i className={`bx ${item.icon} mr-3 text-xl`}></i>
                        <span>{item.title}</span>
                      </div>
                      <i className={`bx ${expandedGroups[item.title] ? 'bx-chevron-up' : 'bx-chevron-down'} text-lg transition-transform duration-200`}></i>
                    </button>
                    
                    {/* Submenu items with animation */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      expandedGroups[item.title] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <ul className="mt-2 ml-4 space-y-1">
                        {item.items.map((subItem, index) => (
                          <li 
                            key={subItem.path}
                            className={`transform transition-all duration-200 ease-in-out ${
                              expandedGroups[item.title] 
                                ? 'translate-y-0 opacity-100' 
                                : '-translate-y-2 opacity-0'
                            }`}
                            style={{ 
                              transitionDelay: expandedGroups[item.title] ? `${index * 50}ms` : '0ms' 
                            }}
                          >
                            <button
                              onClick={() => {
                                navigate(`/admin/${subItem.path}`);
                                if (window.innerWidth < 1024) setSidebarOpen(false);
                              }}
                              className={`
                                w-full text-left px-4 py-2 rounded-lg transition-all text-sm
                                hover:bg-blue-700/50 hover:shadow-md hover:translate-x-1
                                ${
                                  activeTab === subItem.path
                                    ? "bg-blue-700/70 shadow-md"
                                    : "bg-transparent"
                                }
                                flex items-center
                              `}
                            >
                              <i className={`bx ${subItem.icon} mr-3 text-lg`}></i>
                              <span>{subItem.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  // Regular link
                  <button
                    onClick={() => {
                      navigate(`/admin/${item.path}`);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg transition-all
                      hover:bg-blue-700/50 hover:shadow-md
                      ${
                        activeTab === item.path
                          ? "bg-blue-700/70 shadow-md"
                          : "bg-transparent"
                      }
                      flex items-center justify-between
                    `}
                  >
                    <div className="flex items-center">
                      <i className={`bx ${item.icon} mr-3 text-xl`}></i>
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-blue-300">
              <div>Last login: {new Date().toLocaleString()}</div>
              <div>v2.4.1</div>
            </div>
            
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 rounded-lg transition-all hover:shadow-md"
          >
            <i className="bx bx-log-out-circle mr-2 text-xl"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50 relative">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex justify-between items-center p-4">
            <h2 className="text-xl font-semibold text-gray-800 capitalize">
              {activeTab.replace(/-/g, ' ')}
            </h2>
            <div className="flex items-center space-x-4 relative">
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

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {userData?.name?.charAt(0) || 'A'}
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {userData?.name || 'Admin'}
                </span>
              </div>

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
                      disabled={notifications.length === 0 || isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete all'}
                    </button>
                  </div>

                  {notificationError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm">
                      {notificationError}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {notifLoading ? (
                      <div className="animate-pulse p-4 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-gray-500">No notifications</div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 p-4 border-b ${getNotifStyle(notif.message)} ${!notif.is_read ? 'font-semibold' : ''}`}
                        >
                          <i className={`bx ${getNotifIcon(notif.message)} text-xl mt-1`}></i>
                          <div className="flex-1">
                            <div>
                              {notif.message}
                              {notif.message.toLowerCase().includes('support') && (
                                <button
                                  onClick={() => navigate('/admin/support')}
                                  className="ml-2 text-blue-600 underline hover:text-blue-800 text-sm"
                                >
                                  View Ticket
                                </button>
                              )}
                              {notif.message.toLowerCase().includes('posted:') && (
                                <button
                                  onClick={() => navigate('/admin/community')}
                                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                                >
                                  View Community
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t text-center">
                    <button
                      onClick={() => {
                        navigate('/admin/notifications');
                        setShowNotifications(false);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View All Notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/admin/dashboard')}>Home</span>
            <i className="bx bx-chevron-right mx-2"></i>
            <span className="capitalize">{activeTab.replace(/-/g, ' ')}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <PageTransitionWrapper>
              <Outlet />
            </PageTransitionWrapper>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;































