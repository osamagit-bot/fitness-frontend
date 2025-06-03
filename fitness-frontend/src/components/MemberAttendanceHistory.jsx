// src/components/MemberAttendanceHistory.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MemberAttendanceHistory = ({ memberId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  
  const API_BASE_URL = 'http://127.0.0.1:8000';
  
  // For debug display - get member info
  const [memberInfo, setMemberInfo] = useState({
    foundId: null,
    source: null
  });

  useEffect(() => {
    const id = findMemberId();
    fetchAttendanceHistory(id);
  }, [memberId]);

  // Find member ID from all possible sources
  const findMemberId = () => {
    // First try prop
    if (memberId) {
      setMemberInfo({
        foundId: memberId,
        source: "prop"
      });
      return memberId;
    }
    
    // Try URL path
    const urlId = getMemberIdFromUrl();
    if (urlId) {
      setMemberInfo({
        foundId: urlId,
        source: "url"
      });
      return urlId;
    }
    
    // Try localStorage
    const storageId = getMemberIdFromStorage();
    if (storageId) {
      setMemberInfo({
        foundId: storageId,
        source: "localStorage"
      });
      return storageId;
    }
    
    // Nothing found
    setMemberInfo({
      foundId: null,
      source: "none"
    });
    return null;
  };

  // Get member ID from URL
  const getMemberIdFromUrl = () => {
    const path = window.location.pathname;
    const matches = path.match(/\/member-dashboard\/(\d+)\//) || 
                   path.match(/\/members\/(\d+)\//) ||
                   path.match(/\/member\/(\d+)\//);
    
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  };

  // Get member ID from storage
  const getMemberIdFromStorage = () => {
    // Try direct keys
    const directKeys = ['memberId', 'athleteId', 'member_id', 'id'];
    for (const key of directKeys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    
    // Try userInfo object
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.athlete_id) return userInfo.athlete_id;
      if (userInfo.id) return userInfo.id;
      if (userInfo.memberId) return userInfo.memberId;
    } catch (e) {
      console.error("Error parsing userInfo:", e);
    }
    
    return null;
  };

  const fetchAttendanceHistory = async (id) => {
    if (!id) {
      setError("No member ID available. Please log in again.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Log debug information
    console.log(`Fetching attendance for member ID: ${id}`);
    setDebugInfo({
      memberId: id,
      attemptedEndpoints: []
    });
    
    // Try different endpoint formats
    const endpoints = [
      `${API_BASE_URL}/api/attendance/history/${id}/`,
      `${API_BASE_URL}/api/attendance/member/${id}/`,
      `${API_BASE_URL}/attendance/history/${id}/`,
      `${API_BASE_URL}/attendance/member/${id}/`
    ];
    
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          attemptedEndpoints: [...(prev.attemptedEndpoints || []), endpoint]
        }));
        
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await axios.get(endpoint);
        
        if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
          console.log('Attendance data:', response.data);
          
          // Handle both array and object responses
          const records = Array.isArray(response.data) ? response.data : [response.data];
          
          setAttendanceRecords(records);
          setLoading(false);
          success = true;
          break;
        }
      } catch (err) {
        console.log(`Error with endpoint ${endpoint}:`, err.message);
      }
    }
    
    if (!success) {
      // If all endpoints failed, try with query parameter
      try {
        const endpoint = `${API_BASE_URL}/api/attendance/history/?member_id=${id}`;
        setDebugInfo(prev => ({
          ...prev,
          attemptedEndpoints: [...(prev.attemptedEndpoints || []), endpoint]
        }));
        
        console.log(`Trying endpoint with query: ${endpoint}`);
        const response = await axios.get(endpoint);
        
        if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
          const records = Array.isArray(response.data) ? response.data : [response.data];
          setAttendanceRecords(records);
          setLoading(false);
          success = true;
        }
      } catch (err) {
        console.log('Error with query endpoint:', err.message);
        setError("Could not fetch attendance history. Please try again later.");
        setLoading(false);
      }
    }
    
    if (!success) {
      setError("Failed to fetch attendance records. Please try again later.");
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString();
    } catch (e) {
      return timeString;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p>Loading attendance history...</p>
        <div className="text-xs text-gray-500 mt-2">
          <p>Member ID: {memberInfo.foundId || 'Not found'}</p>
          <p>Source: {memberInfo.source || 'None'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          <p>Member ID: {memberInfo.foundId || 'Not found'}</p>
          <p>Source: {memberInfo.source || 'None'}</p>
          <p>Attempted endpoints: {debugInfo.attemptedEndpoints?.join(', ')}</p>
        </div>
        <button 
          onClick={() => fetchAttendanceHistory(memberInfo.foundId)}
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!attendanceRecords || attendanceRecords.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No attendance records found.</p>
        <div className="text-xs text-gray-500 mt-2">
          <p>Member ID: {memberInfo.foundId || 'Not found'}</p>
          <p>Source: {memberInfo.source || 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="text-xs text-gray-500 mb-2">
        <p>Member ID: {memberInfo.foundId || 'Not found'} (Source: {memberInfo.source || 'None'})</p>
      </div>
      <table className="min-w-full bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 text-left">Date</th>
            <th className="py-2 px-4 text-left">Check-in Time</th>
            <th className="py-2 px-4 text-left">Verification</th>
          </tr>
        </thead>
        <tbody>
          {attendanceRecords.map((record, index) => (
            <tr key={record.id || index} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">{formatDate(record.date)}</td>
              <td className="py-2 px-4">{formatTime(record.check_in_time)}</td>
              <td className="py-2 px-4">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {record.verification_method || 'Biometric'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemberAttendanceHistory;
