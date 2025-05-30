// src/pages/AttendancePage.jsx
import React, { useState } from 'react';
import { Tabs, Tab } from '@mantine/core';
import BiometricCheckIn from '../components/BiometricCheckIn';
import BiometricRegistration from '../components/BiometricRegistration';
import AttendanceHistory from '../components/AttendanceHistory';

const AttendancePage = () => {
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('check-in');
  
  // Callback function when check-in is successful
  const handleCheckInSuccess = () => {
    setRefreshHistory(prev => !prev); // Toggle to trigger refresh
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Attendance Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Tabs value={activeTab} onTabChange={setActiveTab}>
            <Tab value="check-in" label="Biometric Check-in">
              <BiometricCheckIn onCheckInSuccess={handleCheckInSuccess} />
            </Tab>
            <Tab value="register" label="Register Biometrics">
              <BiometricRegistration />
            </Tab>
          </Tabs>
        </div>
        
        <div>
          <AttendanceHistory key={refreshHistory} />
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;