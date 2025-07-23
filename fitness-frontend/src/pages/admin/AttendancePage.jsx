import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const AttendancePage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMember, setSelectedMember] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    weeklyCount: 0,
    monthlyCount: 0,
    totalMembers: 0
  });

  const calculateMemberAbsentDays = (memberStartDate, attendanceCount) => {
    if (!memberStartDate) return 0;
    
    const startDate = new Date(memberStartDate);
    const today = new Date();
    const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, totalDays - attendanceCount);
  };

  const calculateMemberAttendanceRate = (memberStartDate, attendanceCount) => {
    if (!memberStartDate) return 0;
    
    const startDate = new Date(memberStartDate);
    const today = new Date();
    const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    if (totalDays === 0) return 100;
    
    return Math.min(100, Math.round((attendanceCount / totalDays) * 100));
  };

  useEffect(() => {
    fetchMembers();
    fetchAttendanceData();
    fetchStats();
  }, [selectedDate, selectedMember]);

  const fetchMembers = async () => {
    try {
      const response = await api.get('members/');
      console.log('🔍 Members response:', response.data); // Debug log
      
      // Handle different response formats
      let membersData;
      if (Array.isArray(response.data)) {
        membersData = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        membersData = response.data.results;
      } else {
        console.warn('⚠️ Unexpected members data format:', response.data);
        membersData = [];
      }
      
      setMembers(membersData);
    } catch (error) {
      console.error('❌ Error fetching members:', error);
      setMembers([]); // Fallback to empty array
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedMember) params.append('member_id', selectedMember);
      
      console.log('🔍 Fetching attendance with params:', params.toString());
      
      // Use the correct endpoint
      const response = await api.get(`attendance_history/?${params}`);
      console.log('🔍 Attendance response:', response.data);
      
      setAttendanceData(response.data);
    } catch (error) {
      console.error('❌ Error fetching attendance data:', error);
      console.error('❌ Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log('🔍 Fetching stats for today:', today);
      
      // Today's attendance
      const todayResponse = await api.get(`attendance_history/?date=${today}`);
      
      // Weekly attendance (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyResponse = await api.get(`attendance_history/?start_date=${weekAgo.toISOString().split('T')[0]}&end_date=${today}`);
      
      // Monthly attendance
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthlyResponse = await api.get(`attendance_history/?start_date=${monthAgo.toISOString().split('T')[0]}&end_date=${today}`);

      setStats({
        todayCount: todayResponse.data.length,
        weeklyCount: weeklyResponse.data.length,
        monthlyCount: monthlyResponse.data.length,
        totalMembers: members.length
      });
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

 const addManualAttendance = async (memberAthleteId) => {
   try {
     const response = await api.post("webauthn/checkin/", {
       athlete_id: memberAthleteId,
       manual_entry: true,
     });

     const msg = response.data?.message || "";

     if (msg.includes("Already checked in")) {
       toast.info("Member has already checked in today.");
     } else if (msg.includes("Check-in successful")) {
       toast.success("Manual attendance recorded successfully!");
     } else {
       toast.info(msg); // fallback for any other message
     }

     fetchAttendanceData();
     fetchStats();
   } catch (error) {
     const errMsg = error.response?.data?.error || error.message;
     if (errMsg.includes("Fingerprint not registered")) {
       toast.error("Sorry, member not registered yet.");
     } else {
       toast.error("Failed to record attendance");
     }
   }
 };


  const exportAttendance = () => {
    if (attendanceData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Date', 'Member ID', 'Member Name', 'Check-in Time', 'Verification Method'],
      ...attendanceData.map(record => [
        record.date,
        record.member_id,
        `${record.member?.first_name || ''} ${record.member?.last_name || ''}`,
        record.check_in_time,
        record.verification_method
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendance data exported successfully!');
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Attendance Management</h1>
            <p className="text-gray-600">Monitor and manage member attendance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="bx bx-plus"></i>
              Manual Entry
            </button>
            <button
              onClick={exportAttendance}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <i className="bx bx-download"></i>
              Export
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Today</p>
              <p className="text-3xl font-bold">{stats.todayCount}</p>
              <p className="text-blue-100 text-sm">Check-ins</p>
            </div>
            <i className="bx bx-calendar-check text-3xl text-blue-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">This Week</p>
              <p className="text-3xl font-bold">{stats.weeklyCount}</p>
              <p className="text-green-100 text-sm">Check-ins</p>
            </div>
            <i className="bx bx-trending-up text-3xl text-green-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">This Month</p>
              <p className="text-3xl font-bold">{stats.monthlyCount}</p>
              <p className="text-purple-100 text-sm">Check-ins</p>
            </div>
            <i className="bx bx-bar-chart text-3xl text-purple-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Members</p>
              <p className="text-3xl font-bold">{stats.totalMembers}</p>
              <p className="text-orange-100 text-sm">Registered</p>
            </div>
            <i className="bx bx-users text-3xl text-orange-200"></i>
          </div>
        </div>
      </motion.div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Manual Attendance Entry</h3>
              <button
                onClick={() => setShowManualEntry(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="bx bx-x text-2xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Member
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Choose a member...</option>
                  {members.map(member => (
                    <option key={member.athlete_id} value={member.athlete_id}>
                      {member.first_name} {member.last_name} ({member.athlete_id})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const select = document.querySelector('select');
                    if (select.value) {
                      addManualAttendance(select.value);
                      setShowManualEntry(false);
                    } else {
                      toast.error('Please select a member');
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Record Attendance
                </button>
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Members</option>
              {members.map(member => (
                <option key={member.athlete_id} value={member.athlete_id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedMember('');
              }}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </motion.div>

      {/* Attendance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Attendance Records</h2>
            <div className="text-sm text-gray-500">
              {attendanceData.length} records found
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading attendance data...</p>
            <p className="text-sm text-gray-400 mt-1">Please wait while we fetch the records</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="p-8 text-center">
            <i className="bx bx-calendar-x text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">No attendance records found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Absent Days / Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <i className="bx bx-user text-blue-600"></i>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.member_name}
                          </div>
                          <div className="text-sm text-gray-500">ID: {record.member_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDate(record.date)}</span>
                        <span className="text-gray-500">{formatTime(record.check_in_time)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i className="bx bx-fingerprint mr-1"></i>
                        {record.verification_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="text-red-600 font-medium">
                          {calculateMemberAbsentDays(record.member_start_date, record.member_total_attendance)} absent
                        </span>
                        <span className="text-green-600 text-xs">
                          {calculateMemberAttendanceRate(record.member_start_date, record.member_total_attendance)}% rate
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AttendancePage;












