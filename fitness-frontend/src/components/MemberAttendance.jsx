// src/components/MemberAttendance.jsx
import React, { useState } from 'react';
import MemberAttendanceHistory from './MemberAttendanceHistory';

const MemberAttendance = () => {
  const [memberId, setMemberId] = useState(null);
  
  // Get member ID from storage or URL when component mounts
  React.useEffect(() => {
    const id = getMemberIdFromStorageOrURL();
    setMemberId(id);
  }, []);
  
  const getMemberIdFromStorageOrURL = () => {
    // Try to get from localStorage first
    const storageKeys = ['athleteId', 'memberId', 'member_id', 'id'];
    for (const key of storageKeys) {
      const id = localStorage.getItem(key);
      if (id) return id;
    }
    
    // Try to get from userInfo object
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      for (const key of [...storageKeys, 'athlete_id']) {
        if (userInfo[key]) return userInfo[key];
      }
    } catch (e) {
      console.error("Error parsing userInfo", e);
    }
    
    // Try to extract from URL
    const urlParts = window.location.pathname.split('/');
    for (const part of urlParts) {
      if (!isNaN(part) && part.trim() !== '') {
        return part;
      }
    }
    
    return null;
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Recent Attendance</h2>
      
      {memberId ? (
        <MemberAttendanceHistory memberId={memberId} />
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>Unable to determine your member ID.</p>
          <p className="text-sm mt-2">Please contact staff for assistance.</p>
        </div>
      )}
    </div>
  );
};

export default MemberAttendance;
