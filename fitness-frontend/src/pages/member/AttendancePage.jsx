import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";
import api from "../../utils/api";
import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  registerCredential,
} from "../../utils/webauthn";

const AttendancePage = () => {
  const { user } = useUser();
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [memberData, setMemberData] = useState(null); // Add member data state

  useEffect(() => {
    const memberId = localStorage.getItem('member_id');
    if (memberId) {
      fetchAttendanceData();
      fetchMemberData(); // Fetch member data for start date
      checkBiometricRegistration();
    }
  }, []);

  const fetchMemberData = async () => {
    try {
      const memberId = localStorage.getItem('member_id');
      if (!memberId) {
        console.error('No member ID found');
        return;
      }
      const response = await api.get(`members/${memberId}/`);
      setMemberData(response.data);
    } catch (error) {
      console.error("Error fetching member data:", error);
    }
  };

  const calculateStreak = (attendanceData) => {
    if (!attendanceData.length) return 0;

    // Get unique dates and sort descending
    const uniqueDates = [...new Set(attendanceData.map(record => record.date))]
      .sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start checking from today or most recent attendance
    let checkDate = new Date(today);
    const mostRecentDate = new Date(uniqueDates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    // If most recent attendance is today, count it
    if (mostRecentDate.getTime() === today.getTime()) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      
      // Check previous days
      for (let i = 1; i < uniqueDates.length; i++) {
        const attendanceDate = new Date(uniqueDates[i]);
        attendanceDate.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);

        if (attendanceDate.getTime() === checkDate.getTime()) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // If most recent is yesterday, start from yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      if (mostRecentDate.getTime() === yesterday.getTime()) {
        streak = 1;
        checkDate = new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);
        
        // Check previous days
        for (let i = 1; i < uniqueDates.length; i++) {
          const attendanceDate = new Date(uniqueDates[i]);
          attendanceDate.setHours(0, 0, 0, 0);
          checkDate.setHours(0, 0, 0, 0);

          if (attendanceDate.getTime() === checkDate.getTime()) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return streak;
  };

  const calculateAbsentDays = (attendanceData, memberStartDate) => {
    if (!attendanceData.length || !memberStartDate) return 0;

    const startDate = new Date(memberStartDate);
    const today = new Date();
    
    // Calculate total days since joining (excluding today if not checked in)
    const totalDaysSinceJoining = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    // Count actual attendance days
    const attendanceDays = attendanceData.length;
    
    // Absent days = Total days - Attendance days
    const absentDays = Math.max(0, totalDaysSinceJoining - attendanceDays);
    
    return absentDays;
  };

  const calculateAttendanceRate = (attendanceData, memberStartDate) => {
    if (!attendanceData.length || !memberStartDate) return 0;

    const startDate = new Date(memberStartDate);
    const today = new Date();
    const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    if (totalDays === 0) return 100;
    
    const attendanceRate = (attendanceData.length / totalDays) * 100;
    return Math.min(100, Math.round(attendanceRate));
  };

  const fetchAttendanceData = async () => {
    try {
      const memberId = localStorage.getItem('member_id');
      if (!memberId) {
        console.error('No member ID found');
        setAttendanceHistory([]);
        return;
      }

      // Use the member-specific attendance endpoint
      const response = await api.get(
        `attendance_history/?member_id=${memberId}`
      );
      
      const attendanceData = Array.isArray(response.data) ? response.data : [];
      setAttendanceHistory(attendanceData);

      // Calculate current streak
      const streak = calculateStreak(attendanceData);
      setCurrentStreak(streak);

      // Check if already checked in today
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = attendanceData.find((record) => record.date === today);
      setTodayAttendance(todayRecord);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      setAttendanceHistory([]);
    }
  };

  const checkBiometricRegistration = async () => {
    try {
      const memberId = localStorage.getItem('member_id');
      if (!memberId) {
        setIsRegistered(false);
        return;
      }
      const response = await api.get(`members/${memberId}/`);
      console.log(
        "Member biometric status:",
        response.data.biometric_registered
      );
      setIsRegistered(response.data.biometric_registered || false);
    } catch (error) {
      console.error("Error checking biometric registration:", error);
      setIsRegistered(false);
    }
  };
const registerFingerprint = async () => {
  console.log("🔍 DEBUG - Full user object:", user);
  console.log("🔍 DEBUG - user.athlete_id:", user?.athlete_id);
  console.log("🔍 DEBUG - localStorage member_id:", localStorage.getItem('member_id'));
  
  if (!isWebAuthnSupported()) {
    toast.error("WebAuthn not supported in this browser");
    return;
  }

  const isAvailable = await isPlatformAuthenticatorAvailable();
  if (!isAvailable) {
    toast.error("No fingerprint sensor detected on this device");
    return;
  }

  setLoading(true);
  try {
    // Try multiple sources for athlete_id
    const athleteId = user?.athlete_id || 
                     localStorage.getItem('member_id') || 
                     user?.id;
    
    console.log("🔍 DEBUG - Using athlete_id:", athleteId);
    
    if (!athleteId) {
      toast.error("User athlete ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const optionsResponse = await api.post("webauthn/register/options/", {
      athlete_id: athleteId,
    });

    const options = optionsResponse.data.options;
    const credential = await registerCredential(options);

    const registrationData = {
      athlete_id: athleteId,
      biometric_hash: credential.rawId,
      credential_response: credential,
    };

    const response = await api.post(
      "webauthn/register/complete/",
      registrationData
    );

    setIsRegistered(true);
    toast.success("Fingerprint registered successfully!");
    checkBiometricRegistration(); // Refresh registration status
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "NotAllowedError") {
      toast.error("Fingerprint registration was cancelled or not allowed");
    } else if (error.name === "InvalidStateError") {
      toast.error("This fingerprint is already registered");
    } else if (error.response?.data?.message) {
      // Show the specific error message from backend
      toast.error(error.response.data.message);
    } else if (error.response?.status === 400) {
      // This catches our duplicate fingerprint error
      toast.error(
        "Registration failed. This fingerprint is already registered to another member."
      );
    } else {
      toast.error("Failed to register fingerprint. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};


  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto ml-0 min-h-screen bg-gradient-to-br from-gray-800 via-gray-800 to-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
          Attendance & Check-in
        </h1>
        <p className="text-sm sm:text-base text-gray-300">
          Track your gym attendance with fingerprint authentication
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Fingerprint Registration Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-700 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-600"
        >
          <div className="text-center">
            <div className="mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                <i className="bx bx-fingerprint text-black text-2xl sm:text-4xl"></i>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
                Fingerprint Registration
              </h2>

              {!isRegistered ? (
                <div>
                  <p className="text-sm sm:text-base text-gray-300 mb-4 px-2">
                    Register your fingerprint to enable quick check-in
                  </p>
                  <button
                    onClick={registerFingerprint}
                    disabled={loading}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto text-sm sm:text-base"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">Registering...</span>
                        <span className="sm:hidden">Loading...</span>
                      </>
                    ) : (
                      <>
                        <i className="bx bx-fingerprint text-lg sm:text-xl"></i>
                        <span className="hidden sm:inline">Register Fingerprint</span>
                        <span className="sm:hidden">Register</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-green-900/30 text-green-400 px-3 sm:px-4 py-2 rounded-lg mb-4">
                    <i className="bx bx-check-circle text-xl sm:text-2xl mb-2"></i>
                    <p className="font-semibold text-sm sm:text-base">
                      Fingerprint Registered Successfully
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Attendance History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-700 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-600"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Recent Attendance
            </h3>
            <div className="text-xs sm:text-sm text-gray-300">
              Total visits: {attendanceHistory.length}
            </div>
          </div>

          <div className="max-h-80 sm:max-h-96 overflow-y-auto">
            {attendanceHistory.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <i className="bx bx-calendar-x text-3xl sm:text-4xl text-gray-500 mb-2"></i>
                <p className="text-sm sm:text-base text-gray-300">No attendance records yet</p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Start checking in to see your history
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {attendanceHistory.slice(0, 10).map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-600 rounded-lg border border-gray-500"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="bx bx-check text-yellow-400 text-sm sm:text-base"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-xs sm:text-sm truncate">
                          {formatDate(record.date)}
                        </p>
                        <p className="text-xs text-gray-300">
                          {formatTime(record.check_in_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                        <i className="bx bx-fingerprint mr-1 text-xs"></i>
                        <span className="hidden sm:inline">{record.verification_method}</span>
                        <span className="sm:hidden">Auth</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {attendanceHistory.length > 10 && (
            <div className="mt-4 text-center">
              <button className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                View All History
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Stats - Member's Personal Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-6"
      >
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-md border border-yellow-500/30 text-white rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-yellow-200 text-xs sm:text-sm">This Month</p>
              <p className="text-lg sm:text-2xl font-bold">
                {
                  attendanceHistory.filter((record) => {
                    const recordDate = new Date(record.date);
                    const now = new Date();
                    return (
                      recordDate.getMonth() === now.getMonth() &&
                      recordDate.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
              <p className="text-yellow-200 text-xs sm:text-sm">My Check-ins</p>
            </div>
            <i className="bx bx-calendar text-2xl sm:text-3xl text-yellow-300 flex-shrink-0"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-md border border-yellow-500/30 text-white rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-yellow-200 text-xs sm:text-sm">This Week</p>
              <p className="text-lg sm:text-2xl font-bold">
                {
                  (() => {
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    const dayOfWeek = today.getDay();
                    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startOfWeek.setDate(today.getDate() - daysToMonday);
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);
                    
                    const thisWeekRecords = attendanceHistory.filter((record) => {
                      const recordDate = new Date(record.date);
                      return recordDate >= startOfWeek && recordDate <= endOfWeek;
                    });
                    
                    const uniqueDays = new Set(thisWeekRecords.map(record => record.date));
                    return uniqueDays.size;
                  })()
                }
              </p>
              <p className="text-yellow-200 text-xs sm:text-sm">My Check-ins</p>
            </div>
            <i className="bx bx-trending-up text-2xl sm:text-3xl text-yellow-300 flex-shrink-0"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-md border border-yellow-500/30 text-white rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-yellow-200 text-xs sm:text-sm">Current Streak</p>
              <p className="text-lg sm:text-2xl font-bold">{currentStreak}</p>
              <p className="text-yellow-200 text-xs sm:text-sm">Days</p>
            </div>
            <i className="bx bx-trophy text-2xl sm:text-3xl text-yellow-300 flex-shrink-0"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-md border border-yellow-500/30 text-white rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-yellow-200 text-xs sm:text-sm">Absent Days</p>
              <p className="text-lg sm:text-2xl font-bold">
                {memberData ? calculateAbsentDays(attendanceHistory, memberData.start_date) : 0}
              </p>
              <p className="text-yellow-200 text-xs sm:text-sm">Days Missed</p>
            </div>
            <i className="bx bx-calendar-x text-2xl sm:text-3xl text-yellow-300 flex-shrink-0"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-md border border-yellow-500/30 text-white rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-yellow-200 text-xs sm:text-sm">Attendance Rate</p>
              <p className="text-lg sm:text-2xl font-bold">
                {memberData ? calculateAttendanceRate(attendanceHistory, memberData.start_date) : 0}%
              </p>
              <p className="text-yellow-200 text-xs sm:text-sm">Success Rate</p>
            </div>
            <i className="bx bx-trending-up text-2xl sm:text-3xl text-yellow-300 flex-shrink-0"></i>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AttendancePage;






