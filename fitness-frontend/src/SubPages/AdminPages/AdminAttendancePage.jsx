import axios from 'axios';
import { useEffect, useState } from 'react';
import api from '../../utils/api';
const AdminAttendancePage = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [attendanceStats, setAttendanceStats] = useState({
    totalCheckins: 0,
    uniqueMembers: 0,
    avgCheckInTime: null
  });
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [memberAttendanceCounts, setMemberAttendanceCounts] = useState({});

  const API_BASE_URL = 'http://127.0.0.1:8000';

  // Setup Axios interceptor to add Authorization header with token on every request
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    console.log('Token from localStorage:', token);

    const requestInterceptor = axios.interceptors.request.use(
      config => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    return () => {
      // Eject interceptor on cleanup
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  // Helper functions
  const getMemberId = (member) => member?.athlete_id || member?.id;
  const getFullName = (member) => `${member?.first_name || ''} ${member?.last_name || ''}`.trim();
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      if (timeString.includes('T') || timeString.includes(' ')) {
        return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return timeString.split(':').slice(0, 2).join(':');
      }
    } catch (e) {
      return timeString;
    }
  };
  const getMemberNameById = (memberId) => {
    if (!memberId) return 'Unknown';
    const member = members.find(m =>
      String(getMemberId(m)) === String(memberId) ||
      String(m.id) === String(memberId) ||
      String(m.athlete_id) === String(memberId)
    );
    return member ? getFullName(member) : `Member ${memberId}`;
  };

  // Only show members with biometric_registered
  const filteredMembers = members
    .filter(member => member.biometric_registered)
    .filter(member => {
      const fullName = getFullName(member).toLowerCase();
      const id = getMemberId(member)?.toString().toLowerCase() || '';
      return fullName.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
    });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedDate, viewMode, dateRange]);

  useEffect(() => {
    // Fetch attendance counts for all members (for admin view)
    fetchAllMembersAttendanceCounts();
  }, [members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`members/`);
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        data = response.data.results;
      }
      setMembers(data);
    } catch (err) {
      setError('Failed to fetch members: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoadingAttendance(true);
      setAttendanceError(null);
      let url = `${API_BASE_URL}/api/attendance/history/`;
      if (viewMode === 'daily') {
        url += `?date=${selectedDate}`;
      } else if (viewMode === 'range') {
        url += `?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      }
      const response = await axios.get(url);
      if (Array.isArray(response.data)) {
        setAttendanceRecords(response.data);
        calculateAttendanceStats(response.data);
      } else {
        setAttendanceRecords([]);
        setAttendanceStats({
          totalCheckins: 0,
          uniqueMembers: 0,
          avgCheckInTime: null
        });
      }
    } catch (err) {
      setAttendanceError('Failed to fetch attendance records: ' + (err.response?.data?.message || err.message));
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch attendance count for each member (for admin)
 // Fetch attendance count for each member (for admin)
const fetchAllMembersAttendanceCounts = async () => {
  if (!members.length) return;
  try {
    const counts = {};

    await Promise.all(
      members.map(async (member) => {
        const memberId = getMemberId(member); // Ensure this returns the actual numeric ID
        try {
          const res = await api.get(`attendance/${memberId}/history/`);
          const records = Array.isArray(res.data) ? res.data : res.data.attendance || [];
          counts[memberId] = records.length;
        } catch {
          counts[memberId] = 0;
        }
      })
    );

    setMemberAttendanceCounts(counts);
  } catch {
    setMemberAttendanceCounts({});
  }
};


  const calculateAttendanceStats = (records) => {
    const totalCheckins = records.length;
    const uniqueMemberIds = new Set();
    records.forEach(record => {
      if (record.member_id) uniqueMemberIds.add(record.member_id);
      if (record.athlete_id) uniqueMemberIds.add(record.athlete_id);
    });
    let avgCheckInTime = null;
    if (records.length > 0 && viewMode === 'daily') {
      let totalMinutes = 0;
      let count = 0;
      records.forEach(record => {
        if (record.check_in_time) {
          try {
            const timeString = record.check_in_time.split(' ')[1];
            if (timeString) {
              const [hours, minutes] = timeString.split(':').map(Number);
              totalMinutes += hours * 60 + minutes;
              count++;
            }
          } catch (e) {}
        }
      });
      if (count > 0) {
        const avgMinutes = Math.round(totalMinutes / count);
        const hours = Math.floor(avgMinutes / 60);
        const minutes = avgMinutes % 60;
        avgCheckInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    setAttendanceStats({
      totalCheckins,
      uniqueMembers: uniqueMemberIds.size,
      avgCheckInTime
    });
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setCheckInStatus(null);
    setShowSuccessCard(false);
  };

  // Biometric check-in handler
  const handleBiometricCheckIn = async () => {
    if (!selectedMember) {
      setError('Please select a member first');
      return;
    }
    setError(null);
    setCheckInStatus('loading');
    try {
      const res = await api.post(`biometrics/check-in/`, {
        athlete_id: getMemberId(selectedMember)
      });
      setCheckInStatus('success');
      setShowSuccessCard(true);
      fetchAttendanceRecords();
      fetchAllMembersAttendanceCounts(); // update counts after check-in
    } catch (err) {
      setCheckInStatus('error');
      setError(err.response?.data?.error || 'Check-in failed');
    }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Attendance Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {showSuccessCard && (
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 border border-green-300 rounded-lg shadow-lg p-6 flex items-center space-x-4 w-full max-w-md">
            <div className="flex-shrink-0">
              <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="12" fill="#22c55e" opacity="0.15"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-green-700 mb-1">Check-in Successful!</h2>
              <p className="text-green-700 text-sm">
                {getFullName(selectedMember)} has been checked in for today.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessCard(false)}
              className="ml-auto text-green-700 hover:text-green-900 text-xl font-bold focus:outline-none"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Selection Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Select Member for Check-in</h2>
          <div className="mb-4">
            <input 
              type="text" 
              placeholder="Search members..." 
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              {filteredMembers.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Present</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map(member => (
                      <tr 
                        key={getMemberId(member)} 
                        className={`hover:bg-gray-50 ${selectedMember?.id === member.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{getFullName(member)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getMemberId(member)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                          {memberAttendanceCounts[getMemberId(member)] ?? '...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleSelectMember(member)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {members.length > 0 ? 'No matching members found' : 'No members found'}
                </div>
              )}
            </div>
          )}
          {selectedMember && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">{getFullName(selectedMember)}</h3>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">Member ID: {getMemberId(selectedMember)}</p>
              <div className="flex mb-4">
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  {selectedMember.membership_type || 'Regular Member'}
                </span>
              </div>
              <button
                onClick={handleBiometricCheckIn}
                className={`w-full px-4 py-2 rounded text-white font-semibold transition ${
                  checkInStatus === 'success'
                    ? 'bg-green-500 cursor-not-allowed'
                    : checkInStatus === 'loading'
                    ? 'bg-blue-400 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={checkInStatus === 'success' || checkInStatus === 'loading'}
              >
                {checkInStatus === 'loading'
                  ? 'Checking in...'
                  : checkInStatus === 'success'
                  ? 'Checked In'
                  : 'Check In'}
              </button>
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-lg font-semibold">Attendance Records</h2>
            <div className="flex mt-3 md:mt-0">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    viewMode === 'daily' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Daily View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('range')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                    viewMode === 'range' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>
          </div>
          <div className="mb-6">
            {viewMode === 'daily' ? (
              <div className="flex justify-center">
                <input
                  type="date"
                  className="p-2 border rounded w-full md:w-64"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-2 justify-center">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">From:</span>
                  <input
                    type="date"
                    className="p-2 border rounded"
                    value={dateRange.startDate}
                    max={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">To:</span>
                  <input
                    type="date"
                    className="p-2 border rounded"
                    value={dateRange.endDate}
                    max={new Date().toISOString().split('T')[0]}
                    min={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-xs text-gray-500 uppercase font-semibold">Total Check-ins</div>
              <div className="text-2xl font-bold text-blue-600">{attendanceStats.totalCheckins}</div>
              <div className="text-xs text-gray-500">
                {viewMode === 'daily' ? 'For selected date' : 'In date range'}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="text-xs text-gray-500 uppercase font-semibold">Unique Members</div>
              <div className="text-2xl font-bold text-green-600">{attendanceStats.uniqueMembers}</div>
              <div className="text-xs text-gray-500">
                {viewMode === 'daily' ? 'Visited today' : 'Visited in range'}
              </div>
            </div>
            {viewMode === 'daily' && attendanceStats.avgCheckInTime ? (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="text-xs text-gray-500 uppercase font-semibold">Avg Check-in Time</div>
                <div className="text-2xl font-bold text-purple-600">{attendanceStats.avgCheckInTime}</div>
                <div className="text-xs text-gray-500">Average arrival time</div>
              </div>
            ) : viewMode === 'range' ? (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <div className="text-xs text-gray-500 uppercase font-semibold">Daily Average</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {(() => {
                    if (attendanceStats.totalCheckins === 0) return '0';
                    const startDate = new Date(dateRange.startDate);
                    const endDate = new Date(dateRange.endDate);
                    const days = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
                    return (attendanceStats.totalCheckins / days).toFixed(1);
                  })()}
                </div>
                <div className="text-xs text-gray-500">Check-ins per day</div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 uppercase font-semibold">Date</div>
                <div className="text-2xl font-bold text-gray-600">
                  {formatDate(selectedDate)}
                </div>
                <div className="text-xs text-gray-500">Selected date</div>
              </div>
            )}
          </div>
          {/* Attendance Table */}
          {attendanceError ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{attendanceError}</span>
              </div>
              <button 
                onClick={fetchAttendanceRecords}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : loadingAttendance ? (
            <div className="flex justify-center items-center h-48">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading attendance records...</p>
              </div>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500">No attendance records found for the selected {viewMode === 'daily' ? 'date' : 'date range'}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getMemberNameById(record.member_id || record.athlete_id)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {record.member_id || record.athlete_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(record.check_in_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.verification_method === 'Biometric' 
                            ? 'bg-green-100 text-green-800' 
                            : record.verification_method === 'QR' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.verification_method || 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendancePage;
