// src/components/MemberAttendanceHistory.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MemberAttendanceHistory = ({ memberId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // API base URL
  const API_BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchMemberAttendance();
  }, [memberId]);

  const fetchMemberAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!memberId) {
        console.error("No member ID provided");
        setError("Member ID is required");
        setLoading(false);
        return;
      }
      
      const url = `${API_BASE_URL}/api/attendance/history/${memberId}/`;
      console.log("Fetching member attendance from:", url);
      
      const response = await axios.get(url);
      console.log("Member attendance response:", response.data);
      
      if (Array.isArray(response.data)) {
        setAttendanceRecords(response.data);
      } else {
        console.warn("Unexpected data format, expected array:", response.data);
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error("Error fetching member attendance:", err);
      
      let errorMessage = "Failed to load attendance records";
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = "Member not found";
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-attendance-history">
      <h2 className="text-xl font-semibold mb-4">Your Attendance History</h2>
      
      {/* Loading state */}
      {loading && (
        <div className="text-center py-4">Loading your attendance records...</div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Records table */}
      {!loading && !error && (
        <>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{record.date}</td>
                      <td className="p-2 border">{record.check_in_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Counter for records found */}
              <div className="mt-2 text-sm text-gray-500">
                Found {attendanceRecords.length} {attendanceRecords.length === 1 ? 'record' : 'records'}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemberAttendanceHistory;
