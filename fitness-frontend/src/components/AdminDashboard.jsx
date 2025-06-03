import { useState, useEffect } from 'react';
import 'boxicons/css/boxicons.min.css';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import AdminDashboardStats from './AdminDashboardStats';
import PageTransitionWrapper from './PageTransitionWrapper';

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const user = localStorage.getItem('user');

      if (!token || isAuthenticated !== 'true') {
        navigate('/login');
      } else {
        try {
          setUserData(user ? JSON.parse(user) : null);
          setAuthChecked(true);
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

  const getActiveTab = () => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    return path;
  };

  const activeTab = getActiveTab();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm">
          <div className="flex justify-between items-center p-4">
            <h2 className="text-xl font-semibold text-gray-800 capitalize">
              {activeTab.replace(/-/g, ' ')}
            </h2>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
                <i className="bx bx-bell text-xl"></i>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {userData?.name?.charAt(0) || 'A'}
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {userData?.name || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Breadcrumbs */}
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <span className="hover:text-blue-600 cursor-pointer">Home</span>
            <i className="bx bx-chevron-right mx-2"></i>
            <span className="capitalize">{activeTab.replace(/-/g, ' ')}</span>
          </div>

          {/* Page Content with transition */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <PageTransitionWrapper>
              <Outlet />
            </PageTransitionWrapper>
          </div>

          {/* Stats */}
          {activeTab === 'dashboard' && <AdminDashboardStats />}
        </div>
      </div>

      {/* Scrollbar styles */}
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
