import { useState } from 'react';
import useMultiAuth from '../../hooks/useMultiAuth';

const SessionSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { authState, switchSession, hasAdminSession, hasMemberSession, getCurrentSession } = useMultiAuth();
  
  const currentSession = getCurrentSession();
  
  // Don't show if only one session is active
  if (!hasAdminSession || !hasMemberSession) {
    return null;
  }

  const handleSwitch = (role) => {
    switchSession(role);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
        title="Switch Session"
      >
        <i className={`bx ${currentSession === 'admin' ? 'bx-shield-alt-2' : 'bx-user'} text-lg`}></i>
        <span className="text-sm font-medium">
          {currentSession === 'admin' ? 'Admin' : 'Member'}
        </span>
        <i className={`bx bx-chevron-down text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1 mb-1">Switch to:</div>
            
            {currentSession !== 'admin' && hasAdminSession && (
              <button
                onClick={() => handleSwitch('admin')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-blue-50 rounded-md transition-colors duration-200"
              >
                <i className="bx bx-shield-alt-2 text-blue-500"></i>
                <div>
                  <div className="text-sm font-medium text-gray-900">Admin Panel</div>
                  <div className="text-xs text-gray-500">{authState.admin.user?.name}</div>
                </div>
              </button>
            )}
            
            {currentSession !== 'member' && hasMemberSession && (
              <button
                onClick={() => handleSwitch('member')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-green-50 rounded-md transition-colors duration-200"
              >
                <i className="bx bx-user text-green-500"></i>
                <div>
                  <div className="text-sm font-medium text-gray-900">Member Dashboard</div>
                  <div className="text-xs text-gray-500">{authState.member.user?.name}</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SessionSwitcher;