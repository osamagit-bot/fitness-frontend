import { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import useMultiAuth from "../../hooks/useMultiAuth";
import { useSidebar } from "../../layouts/MemberLayout";

function MemberSidebar({ isOpen: externalIsOpen, closeSidebar: externalCloseSidebar, userData }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(externalIsOpen ?? false);
  const { logout } = useMultiAuth();
  
  // Use the sidebar context from layout
  const sidebarContext = useSidebar();
  const sidebarCollapsed = sidebarContext?.sidebarCollapsed || false;
  const setSidebarCollapsed = sidebarContext?.setSidebarCollapsed || (() => {});

  const isActive = (path) => {
    if (path === '/member-dashboard') {
      return location.pathname === '/member-dashboard';
    }
    return location.pathname === path;
  };
  const firstName = userData?.name || "Member";

  const handleLogout = () => {
    logout('member');
  };

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => {
    setIsOpen(false);
    if (externalCloseSidebar) externalCloseSidebar();
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const menuItems = [
    { path: '/member-dashboard', icon: <i className='bx bx-home-alt text-xl'></i>, label: 'Dashboard' },
    { path: '/member-dashboard/profile', icon: <i className='bx bx-user text-xl'></i>, label: 'My Profile' },
    { path: '/member-dashboard/attendance', icon: <i className='bx bx-calendar-check text-xl'></i>, label: 'Attendance' },
    { path: '/member-dashboard/trainings', icon: <i className='bx bx-dumbbell text-xl'></i>, label: 'Training Sessions' },
    { path: '/member-dashboard/community', icon: <i className='bx bx-group text-xl'></i>, label: 'Community' },
    { path: '/member-dashboard/support', icon: <i className='bx bx-help-circle text-xl'></i>, label: 'Support & Feedback' },
    { path: '/member-dashboard/settings', icon: <i className='bx bx-cog text-xl'></i>, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-yellow-600 flex items-center justify-between px-4 py-3 shadow">
        <button onClick={openSidebar} className="text-white focus:outline-none">
          <i className='bx bx-menu text-2xl'></i>
        </button>
        <span className="text-white font-bold text-lg">Elite Fitness Club</span>
        <div className="w-7" />
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 h-auto left-0 ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-gray-700 to-gray-800 text-white z-40 transform transition-all duration-500 ease-in-out lg:translate-x-0 lg:fixed ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 bg-black/10 border-b border-yellow-700 hidden lg:block">
          <div className="flex flex-col">
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
            
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <i className="bx bx-dumbbell text-2xl text-black"></i>
              </div>
              {!sidebarCollapsed && (
                <div className="ml-4 transition-all duration-300">
                  <h2 className="text-xl font-bold text-white">Elite Fitness Club</h2>
                  <p className="text-sm text-yellow-500">Member Portal</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 mt-16 lg:mt-0">
          {menuItems.map((item) => (
            <div key={item.path} className="hover:scale-105 transition-transform">
              <Link
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-yellow-600 shadow-md text-white'
                    : 'text-blue-100 hover:bg-yellow-700/30'
                }`}
                onClick={closeSidebar}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={`text-yellow-500 ${sidebarCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {isActive(item.path) && (
                      <span className="ml-auto w-2 h-2 bg-yellow-700 rounded-full animate-pulse"></span>
                    )}
                  </>
                )}
              </Link>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700 mt-auto">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-3 text-red-200 hover:text-white bg-gradient-to-r from-red-900/40 to-red-800/40 hover:from-red-800/60 hover:to-red-700/60 rounded-lg transition-all duration-300 group relative overflow-hidden border border-red-800/30`}
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
          </button>
        </div>
      </div>

      {/* Spacer to prevent overlap on small screens */}
      <div className="lg:hidden" style={{ height: '56px' }} />
    </>
  );
}

export default MemberSidebar;
