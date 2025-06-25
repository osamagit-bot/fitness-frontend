import 'boxicons/css/boxicons.min.css';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PageTransitionWrapper from '../../components/PageTransitionWrapper';
import api from '../../utils/api'; // Assuming you have a configured axios instance
import AdminDashboardStats from './AdminDashboardStats';






const getNotifStyle = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('new member registered')) return 'bg-green-50 border-l-4 border-green-400 text-green-800';
  if (lower.includes('membership expired')) return 'bg-red-50 border-l-4 border-red-400 text-red-800';
  if (lower.includes('membership renewed')) return 'bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800';
  if (lower.includes('product added')) return 'bg-blue-50 border-l-4 border-blue-400 text-blue-800';
  if (lower.includes('support')) return 'bg-purple-50 border-l-4 border-purple-400 text-purple-800';
  if (lower.includes('payment')) return 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800';
  return 'bg-gray-50 border-l-4 border-gray-300 text-gray-700';
};

const getNotifIcon = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('new member registered')) return 'bx-user-plus';
  if (lower.includes('membership expired')) return 'bx-error-circle';
  if (lower.includes('membership renewed')) return 'bx-refresh';
  if (lower.includes('product added')) return 'bx-package';
  if (lower.includes('support')) return 'bx-help-circle';
  if (lower.includes('payment')) return 'bx-dollar-circle';
  return 'bx-info-circle';
};

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

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
        } catch (error) {
          console.error('Error parsing user data:', error);
          navigate('/login');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  const getActiveTab = () => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    return path;
  };

  const activeTab = getActiveTab();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };
  const token = localStorage.getItem('access_token');
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const { userType } = JSON.parse(localStorage.getItem('authInfo') || '{}');

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
        throw new Error('Invalid notifications data format');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotificationError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (userType === 'admin' && token) {
      fetchNotifications();
    }
  }, [userType, token]);

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
      }
    } catch (err) {
      console.error('Failed to delete all notifications', err);
      setNotificationError('Failed to delete notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
      <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex justify-between items-center shadow-lg z-30">
        <h1 className="text-xl font-bold text-white">Admin Portal</h1>
        <button
          onClick={toggleSidebar}
          className="text-white focus:outline-none transition-transform hover:scale-110"
        >
          <i className={`bx ${sidebarOpen ? 'bx-x' : 'bx-menu'} text-3xl`}></i>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:w-72 bg-gradient-to-b from-indigo-700 to-blue-800 text-white flex flex-col
        transform transition-all duration-300 ease-in-out
        fixed lg:relative z-20 h-full lg:h-auto
        w-80 shadow-xl
      `}>
        <div className="p-6 pb-4 border-b border-blue-600">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
              <i className="bx bx-user text-2xl"></i>
            </div>
            <div>
              <h1 className="text-md font-bold">Admin Dashboard</h1>
              <p className="text-sm text-blue-200">{userData?.email || 'Administrator'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
          <ul className="space-y-1 px-4">
            {[
              { path: 'dashboard', icon: 'bx-home', label: 'Dashboard' },
              { path: 'register', icon: 'bxs-add-to-queue', label: 'Register Member' },
              { path: 'products', icon: 'bx-package', label: 'Products' },
              { path: 'trainings', icon: 'bx-dumbbell', label: 'Trainings' },
              { path: 'attendance', icon: 'bx-qr-scan', label: 'Attendance' },
              { path: 'revenue', icon: 'bx-dollar', label: 'Revenue' },
              { path: 'members', icon: 'bx-user', label: 'Members' },
              { path: 'trainers', icon: 'bx-user-voice', label: 'Trainers' },
              { path: 'community', icon: 'bx-message-square-detail', label: 'Community' },
              { path: 'support', icon: 'bx-help-circle', label: 'Support' },
              { path: 'adminsettings', icon: 'bx-cog', label: 'Settings' },
            ].map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => {
                    navigate(`/admin/${item.path}`);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-all
                    hover:bg-blue-600 hover:shadow-md hover:translate-x-1
                    ${activeTab === item.path ?
                    'bg-blue-600 shadow-md translate-x-1' :
                    'bg-transparent'}
                    flex items-center
                  `}
                >
                  <i className={`bx ${item.icon} mr-3 text-xl`}></i>
                  <span>{item.label}</span>
                  {activeTab === item.path && (
                    <span className="ml-auto w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-blue-600">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all hover:shadow-md"
          >
            <i className="bx bx-log-out mr-2 text-xl"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50 relative">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
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
                <div className="absolute right-0 top-14 bg-white shadow-xl rounded-lg w-96 z-50 border border-gray-200 overflow-hidden">
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

          {activeTab === 'dashboard' && <AdminDashboardStats />}
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