// components/SessionSwitcher.jsx
import { useState, useEffect } from 'react';
import { switchToMemberSession, switchToAdminSession, getAvailableSessions, getCurrentSession } from '../utils/sessionManager';

const SessionSwitcher = () => {
  const [availableSessions, setAvailableSessions] = useState({ member: false, admin: false });
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    setAvailableSessions(getAvailableSessions());
    setCurrentSession(getCurrentSession());
  }, []);

  const handleSwitchSession = (sessionType) => {
    if (sessionType === 'member' && availableSessions.member) {
      if (switchToMemberSession()) {
        window.location.href = '/member-dashboard';
      }
    } else if (sessionType === 'admin' && availableSessions.admin) {
      if (switchToAdminSession()) {
        window.location.href = '/admin/dashboard';
      }
    }
  };

  // Show always for debugging
  console.log('SessionSwitcher state:', { availableSessions, currentSession });
  
  // Only show if multiple sessions are available
  if (!availableSessions.member || !availableSessions.admin) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 shadow-lg rounded-lg p-4 border z-50">
        <h3 className="text-sm font-semibold mb-2">Debug: Sessions</h3>
        <div className="text-xs">
          <p>Member: {availableSessions.member ? '✅' : '❌'}</p>
          <p>Admin: {availableSessions.admin ? '✅' : '❌'}</p>
          <p>Current: {currentSession || 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 border z-50">
      <h3 className="text-sm font-semibold mb-2">Switch Session</h3>
      <div className="space-y-2">
        <button
          onClick={() => handleSwitchSession('member')}
          disabled={currentSession === 'member'}
          className={`w-full px-3 py-1 text-sm rounded ${
            currentSession === 'member'
              ? 'bg-blue-500 text-white cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Member {currentSession === 'member' && '(Current)'}
        </button>
        <button
          onClick={() => handleSwitchSession('admin')}
          disabled={currentSession === 'admin'}
          className={`w-full px-3 py-1 text-sm rounded ${
            currentSession === 'admin'
              ? 'bg-blue-500 text-white cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Admin {currentSession === 'admin' && '(Current)'}
        </button>
      </div>
    </div>
  );
};

export default SessionSwitcher;
