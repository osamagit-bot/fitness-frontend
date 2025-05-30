// src/SubPages/MemberPages/MemberDashboard.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import MemberSidebar from '../../components/MemberSidebar';

const MemberDashboard = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar */}
      <MemberSidebar />
      
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MemberDashboard;