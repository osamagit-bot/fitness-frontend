// src/SubPages/MemberPages/MemberDashboard.jsx
import { Outlet } from 'react-router-dom';
import MemberSidebar from '../components/shared/MemberSidebar';

const MemberDashboard = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar */}
      <MemberSidebar />
      
      {/* Main Content */}
      <div className="flex-1 p-4 lg:ml-64 overflow-auto pt-20 lg:pt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default MemberDashboard;
