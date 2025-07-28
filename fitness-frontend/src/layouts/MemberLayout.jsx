import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import MaintenanceCheck from '../components/MaintenanceCheck';
import MemberSidebar from '../components/shared/MemberSidebar';
import useMultiAuth from '../hooks/useMultiAuth';

const MemberDashboard = () => {
  const { authState } = useMultiAuth();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (authState.member.isAuthenticated) {
      setUserData(authState.member.user);
    }
  }, [authState.member.isAuthenticated]);

  return (
    <MaintenanceCheck>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        {/* Sidebar */}
        <MemberSidebar userData={userData} />
        
        {/* Main Content */}
        <div className="flex-1 p-4 lg:ml-64 overflow-auto pt-20 bg-gray-700 lg:pt-4">
          <Outlet />
        </div>
      </div>
    </MaintenanceCheck>
  );
};

export default MemberDashboard;
