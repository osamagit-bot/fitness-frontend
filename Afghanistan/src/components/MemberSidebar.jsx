// src/components/MemberSidebar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

function MemberSidebar({ isOpen: externalIsOpen, closeSidebar: externalCloseSidebar }) {
  // Local state for mobile menu if not controlled externally
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = typeof externalIsOpen === 'boolean' ? externalIsOpen : internalOpen;
  const closeSidebar = externalCloseSidebar || (() => setInternalOpen(false));
  const openSidebar = () => setInternalOpen(true);

  const memberName = localStorage.getItem('name') || 'Member';
  const firstName = memberName.split(' ')[0];
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/member-dashboard' && location.pathname === '/member-dashboard') return true;
    return location.pathname.startsWith(path) && path !== '/member-dashboard';
  };

  const menuItems = [
    {
      path: '/member-dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
      label: 'Dashboard',
    },
    {
      path: '/member-dashboard/profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      ),
      label: 'My Profile',
    },
    {
      path: '/member-dashboard/attendance',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Attendance & QR',
    },
    {
      path: '/member-dashboard/trainings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v4.586l-2.707-2.707a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L11 8.586V4a1 1 0 00-1-1z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M10 17a1 1 0 001-1v-4.586l2.707 2.707a1 1 0 001.414-1.414l-4-4a1 1 0 00-1.414 0l-4 4a1 1 0 101.414 1.414L9 11.414V16a1 1 0 001 1z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Training Sessions',
    },
    {
      path: '/member-dashboard/community',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
      label: 'Community',
    },
    {
      path: '/member-dashboard/support',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Support & Feedback',
    },
    {
      path: '/member-dashboard/shop',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      ),
      label: 'Shop',
    }
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-900 flex items-center justify-between px-4 py-3 shadow">
        <button
          aria-label="Open sidebar"
          onClick={openSidebar}
          className="text-white focus:outline-none"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold text-lg">Elite Fitness Club</span>
        <div className="w-7" /> {/* Spacer for symmetry */}
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 min-h-screen bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-xl z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col`}
        style={{ top: '0' }}
      >
        {/* Header */}
        <div className="p-6 bg-white/10 border-b border-blue-700 hidden lg:block">
          <h2 className="text-xl font-bold text-white">Elite Fitness Club</h2>
          <p className="text-sm text-blue-200">Member Portal</p>
        </div>
        {/* Navigation */}
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
        {/* Profile & Logout */}
        <div className="p-4 bg-blue-900/70 border-t border-blue-700 mt-auto">
          <div className="flex items-center justify-between">
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
      </div>
      {/* Spacer for mobile header */}
      <div className="lg:hidden" style={{ height: '56px' }} />
    </>
  );
}

export default MemberSidebar;