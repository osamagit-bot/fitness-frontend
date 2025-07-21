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

  useEffect(() => {
    if (user?.athlete_id) {
      fetchAttendanceData();
      checkBiometricRegistration();
    }
  }, [user]);

  const calculateStreak = (attendanceData) => {
    if (!attendanceData.length) return 0;

    // Sort by date descending (most recent first)
    const sortedData = [...attendanceData].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < sortedData.length; i++) {
      const recordDate = new Date(sortedData[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      // Check if this record is for the expected consecutive day
      if (recordDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const fetchAttendanceData = async () => {
    try {
      const response = await api.get(
        `attendance_history/?member_id=${user?.athlete_id}`
      );
      setAttendanceHistory(response.data);

      // Calculate current streak
      const streak = calculateStreak(response.data);
      setCurrentStreak(streak);

      // Check if already checked in today
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = response.data.find((record) => record.date === today);
      setTodayAttendance(todayRecord);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const checkBiometricRegistration = async () => {
    try {
      const response = await api.get(`members/${user?.athlete_id}/`);
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
    if (!user?.athlete_id) {
      toast.error("User athlete ID not found. Please log in again.");
      setLoading(false);
      return;
    }

    const optionsResponse = await api.post("webauthn/register/options/", {
      athlete_id: user.athlete_id,
    });

    const options = optionsResponse.data.options;
    const credential = await registerCredential(options);

    const registrationData = {
      athlete_id: user.athlete_id,
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
    <div className="p-6 max-w-6xl mx-auto ml-0 lg:pl-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Attendance & Check-in
        </h1>
        <p className="text-gray-600">
          Track your gym attendance with fingerprint authentication
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Fingerprint Registration Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <div className="text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <i className="bx bx-fingerprint text-white text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Fingerprint Registration
              </h2>

              {!isRegistered ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Register your fingerprint to enable quick check-in
                  </p>
                  <button
                    onClick={registerFingerprint}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-fingerprint text-xl"></i>
                        Register Fingerprint
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg mb-4">
                    <i className="bx bx-check-circle text-2xl mb-2"></i>
                    <p className="font-semibold">
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
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              Recent Attendance
            </h3>
            <div className="text-sm text-gray-500">
              Total visits: {attendanceHistory.length}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {attendanceHistory.length === 0 ? (
              <div className="text-center py-8">
                <i className="bx bx-calendar-x text-4xl text-gray-300 mb-2"></i>
                <p className="text-gray-500">No attendance records yet</p>
                <p className="text-sm text-gray-400">
                  Start checking in to see your history
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceHistory.slice(0, 10).map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="bx bx-check text-blue-600"></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {formatDate(record.date)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTime(record.check_in_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i className="bx bx-fingerprint mr-1"></i>
                        {record.verification_method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {attendanceHistory.length > 10 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All History
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">This Month</p>
              <p className="text-2xl font-bold">
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
              <p className="text-blue-100 text-sm">Check-ins</p>
            </div>
            <i className="bx bx-calendar text-3xl text-blue-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">This Week</p>
              <p className="text-2xl font-bold">
                {
                  attendanceHistory.filter((record) => {
                    const recordDate = new Date(record.date);
                    const now = new Date();
                    const startOfWeek = new Date(
                      now.setDate(now.getDate() - now.getDay())
                    );
                    return recordDate >= startOfWeek;
                  }).length
                }
              </p>
              <p className="text-green-100 text-sm">Check-ins</p>
            </div>
            <i className="bx bx-trending-up text-3xl text-green-200"></i>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Current Streak</p>
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-orange-100 text-sm">Days</p>
            </div>
            <i className="bx bx-fire text-3xl text-orange-200"></i>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AttendancePage;
