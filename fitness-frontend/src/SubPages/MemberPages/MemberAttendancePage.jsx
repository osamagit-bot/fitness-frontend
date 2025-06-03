import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BiometricRegistration from "../../components/BiometricRegistration.jsx";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';

const MemberAttendancePage = () => {
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [presentDays, setPresentDays] = useState(0);
  const [absentDays, setAbsentDays] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [attendanceDates, setAttendanceDates] = useState(new Set());

  const API_BASE_URL = 'api.newdomain.com';

  useEffect(() => {
    fetchMemberData();
  }, []);

  useEffect(() => {
    if (memberId) {
      fetchAttendance();
    }
  }, [memberId]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      let id = localStorage.getItem('athleteId') || localStorage.getItem('memberId');
      if (!id) {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        id = userInfo.athlete_id || userInfo.id;
      }
      setMemberId(id);
      if (!id) throw new Error('No member ID found. Please log in again.');
      const response = await axios.get(`${API_BASE_URL}/api/member-details/${id}/`);
      setMemberData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load member information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/attendance/history/?member_id=${memberId}`);
      let records = Array.isArray(res.data) ? res.data : res.data.attendance || [];
      setAttendance(records);

      // Calculate present days
      const present = new Set();
      records.forEach(rec => {
        if (rec.date) present.add(rec.date);
      });
      setAttendanceDates(present);
      setPresentDays(present.size);

      // Calculate absent days (in current month)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let absent = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        if (dateObj > now) continue; // don't count future days
        if (!present.has(dateStr)) absent++;
      }
      setAbsentDays(absent);
    } catch (err) {
      setAttendance([]);
      setAttendanceDates(new Set());
      setPresentDays(0);
      setAbsentDays(0);
    }
  };

  const handleBiometricSuccess = () => {
    setShowBiometricModal(false);
    setShowSuccessCard(true);
    fetchMemberData();
  };

  // Calendar tileClassName for marking present (green) and absent (red) days
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const dateStr = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
      if (date.getFullYear() === year && date.getMonth() === month && date <= now) {
        if (attendanceDates.has(dateStr)) {
          return 'bg-green-200 text-green-900 font-bold rounded-full'; // Present
        } else {
          return 'bg-red-200 text-red-900 font-bold rounded-full'; // Absent
        }
      }
    }
    return null;
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const dateStr = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
      if (date.getFullYear() === year && date.getMonth() === month && date <= now) {
        if (attendanceDates.has(dateStr)) {
          return <span title="Present" style={{ color: '#22c55e', fontWeight: 'bold' }}>●</span>;
        } else {
          return <span title="Absent" style={{ color: '#ef4444', fontWeight: 'bold' }}>●</span>;
        }
      }
    }
    return null;
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center"
      >
        <motion.div
          animate={{ 
            rotate: 360,
            transition: { 
              repeat: Infinity, 
              duration: 1,
              ease: "linear"
            }
          }}
          className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
        <p className="mt-2 text-gray-600">Loading your attendance data...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 text-center text-red-600"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4"
    >
      <motion.h1 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold mb-6 text-blue-900"
      >
        My Attendance
      </motion.h1>

      {/* Success Card */}
      <AnimatePresence>
        {showSuccessCard && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-green-100 border border-green-300 rounded-lg shadow-lg p-6 flex items-center space-x-4 w-full max-w-md">
              <div className="flex-shrink-0">
                <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="12" fill="#22c55e" opacity="0.15"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-700 mb-1">Fingerprint Registered!</h2>
                <p className="text-green-700 text-sm">You can now use your fingerprint for easy check-in.</p>
              </div>
              <button
                onClick={() => setShowSuccessCard(false)}
                className="ml-auto text-green-700 hover:text-green-900 text-xl font-bold focus:outline-none"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow p-6 mb-6"
      >
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Biometric Authentication</h2>
        <p className="mb-4 text-gray-700">
          {memberData?.biometric_registered
            ? (
              <span>
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold mr-2">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  Registered
                </span>
                Your fingerprint is registered for check-in.
              </span>
            )
            : "Register your fingerprint for easy check-in."
          }
        </p>
        {!memberData?.biometric_registered && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBiometricModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Register Fingerprint
          </motion.button>
        )}
      </motion.div>

      {/* Attendance Summary */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center"
        >
          <div className="text-xs text-gray-500 uppercase font-semibold">Days Present</div>
          <motion.div 
            key={presentDays}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-blue-600"
          >
            {presentDays}
          </motion.div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-red-50 p-4 rounded-lg border border-red-100 text-center"
        >
          <div className="text-xs text-gray-500 uppercase font-semibold">Days Absent</div>
          <motion.div 
            key={absentDays}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-red-600"
          >
            {absentDays}
          </motion.div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-green-50 p-4 rounded-lg border border-green-100 text-center"
        >
          <div className="text-xs text-gray-500 uppercase font-semibold">Total Attendance Records</div>
          <motion.div 
            key={attendance.length}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-green-600"
          >
            {attendance.length}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Calendar View */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow p-6 mb-6"
      >
        <h2 className="text-lg font-semibold mb-4 text-blue-800">Attendance Calendar</h2>
        <Calendar
          value={calendarDate}
          onChange={setCalendarDate}
          tileClassName={tileClassName}
          tileContent={tileContent}
          maxDate={new Date()}
        />
        <div className="mt-2 text-xs text-gray-500">
          <span className="inline-block mr-4">
            <span className="text-green-600 font-bold">●</span> Present
          </span>
          <span className="inline-block">
            <span className="text-red-600 font-bold">●</span> Absent
          </span>
        </div>
      </motion.div>

      {/* Attendance Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h2 className="text-lg font-semibold mb-4 text-blue-800">Attendance History</h2>
        {attendance.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-500 text-center py-8"
          >
            No attendance records found.
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.map((rec, idx) => (
                  <motion.tr 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{rec.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{rec.check_in_time ? rec.check_in_time.split(' ')[1] : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{rec.verification_method || 'Biometric'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{rec.member_id || memberId}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Biometric Registration Modal */}
      <AnimatePresence>
        {showBiometricModal && (
          <BiometricRegistration
            memberId={memberData?.athlete_id || memberId}
            onCancel={() => setShowBiometricModal(false)}
            onSuccess={handleBiometricSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MemberAttendancePage;
