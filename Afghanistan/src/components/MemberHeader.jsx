// src/components/MemberHeader.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaUser } from 'react-icons/fa';

function MemberHeader({ toggleSidebar }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <header className="bg-gray-700 border-b border-gray-800 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="text-yellow-400 focus:outline-none focus:text-yellow-500 md:hidden"
          onClick={toggleSidebar}
        >
          <FaBars className="h-5 w-5" />
        </button>

        <div className="text-xl font-semibold text-yellow-400 md:text-2xl md:block hidden">
          Member Dashboard
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-yellow-400 hover:text-yellow-500 focus:outline-none">
            <FaBell className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              className="flex text-yellow-400 hover:text-yellow-500 focus:outline-none"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center text-black">
                <FaUser className="h-4 w-4" />
              </div>
            </button>

            {isProfileOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-800"
              >
                <a 
                  href="#" 
                  className="block px-4 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                  onClick={() => {
                    navigate('/member-dashboard/profile');
                    setIsProfileOpen(false);
                  }}
                >
                  Profile
                </a>
                <a 
                  href="#" 
                  className="block px-4 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                  onClick={logout}
                >
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default MemberHeader;