import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function MemberSidebar({ isOpen: externalIsOpen, closeSidebar: externalCloseSidebar }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(externalIsOpen ?? false);

  const isActive = (path) => location.pathname.startsWith(path);
  const firstName = localStorage.getItem("firstName") || "Member";

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => {
    setIsOpen(false);
    if (externalCloseSidebar) externalCloseSidebar();
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-900 flex items-center justify-between px-4 py-3 shadow">
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
        className={`fixed inset-y-0 h-auto left-0 w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 bg-white/10 border-b border-blue-700 hidden lg:block">
          <h2 className="text-xl font-bold text-white">Elite Fitness Club</h2>
          <p className="text-sm text-blue-200">Member Portal</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 mt-16 lg:mt-0">
          {menuItems.map((item) => (
            <div key={item.path} className="hover:scale-105 transition-transform">
              <Link
                to={item.path}
                className={`flex items-center p-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-blue-600 shadow-md text-white'
                    : 'text-blue-100 hover:bg-blue-700/50'
                }`}
                onClick={closeSidebar}
              >
                <span className="mr-3 text-blue-300">{item.icon}</span>
                <span>{item.label}</span>
                {isActive(item.path) && (
                  <span className="ml-auto w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                )}
              </Link>
            </div>
          ))}
        </nav>
        <div className="p-4 bg-blue-900/70 border-t border-blue-700 mt-44">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white shadow-md">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-900"></div>
            </div>
            <div className="ml-3">
              <p className="font-medium">{firstName}</p>
              <p className="text-xs text-blue-300">Premium Member</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent overlap on small screens */}
      <div className="lg:hidden" style={{ height: '56px' }} />
    </>
  );
}

export default MemberSidebar;
