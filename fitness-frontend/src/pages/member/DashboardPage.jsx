import "boxicons/css/boxicons.min.css";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import LoadingScreen from "../../components/LoadingScreen";
import api from "../../utils/api";

const MemberDashboardPage = () => {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    const memberId = localStorage.getItem("member_id");
    if (!memberId) {
      setError("Member ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`members/${memberId}/`);
      setMemberData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching member data:", err);
      setError("Failed to load your profile data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getMembershipStatus = () => {
    if (!memberData?.expiry_date) return "Unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate > today) {
      const daysRemaining = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysRemaining <= 7 ? "Expiring Soon" : "Active";
    } else {
      return "Expired";
    }
  };

  const getDaysRemaining = () => {
    if (!memberData?.expiry_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getDaysSinceJoining = () => {
    if (!memberData?.start_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(memberData.start_date);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">
            <i className="bx bx-error-circle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Membership Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Membership Status
                </p>
                <p
                  className={`text-lg font-semibold ${
                    getMembershipStatus() === "Active"
                      ? "text-green-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {getMembershipStatus()}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  getMembershipStatus() === "Active"
                    ? "bg-green-100"
                    : getMembershipStatus() === "Expiring Soon"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
              >
                <i
                  className={`bx ${
                    getMembershipStatus() === "Active"
                      ? "bx-check-shield text-green-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "bx-time text-yellow-600"
                      : "bx-error-circle text-red-600"
                  } text-2xl`}
                ></i>
              </div>
            </div>
          </motion.div>

          {/* Days Remaining */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Days Remaining
                </p>
                <p className="text-2xl font-bold text-yellow-400">
                  {getDaysRemaining()}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-calendar text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>

          {/* Membership Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Membership Type
                </p>
                <p className="text-lg font-semibold text-white">
                  {memberData?.membership_type || "Standard"}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-crown text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>

          {/* Member Since */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Member Since
                </p>
                <p className="text-lg font-semibold text-white">
                  {getDaysSinceJoining()} days
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <i className="bx bx-user-check text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </motion.div>

          {/* Biometric Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Biometric Status
                </p>
                <p className={`text-lg font-semibold ${
                  memberData?.biometric_registered ? "text-green-400" : "text-red-400"
                }`}>
                  {memberData?.biometric_registered ? "Registered" : "Not Registered"}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                memberData?.biometric_registered ? "bg-green-500/20" : "bg-red-500/20"
              }`}>
                <i className={`bx ${
                  memberData?.biometric_registered ? "bx-fingerprint text-green-400" : "bx-error text-red-400"
                } text-2xl`}></i>
              </div>
            </div>
          </motion.div>
        </div>

        {/* PIN Check-in Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl shadow-lg p-6 mb-8 border border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-black mb-2">
                Your Check-in PIN
              </h3>
              <p className="text-black/80 text-sm">
                Use this PIN for quick attendance check-in at the kiosk
              </p>
            </div>
            <div className="text-right">
              {memberData?.pin && memberData?.pin_enabled ? (
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-3xl font-mono font-bold text-black tracking-widest">
                    {memberData.pin}
                  </div>
                  <div className="text-xs text-black/70 mt-1">PIN Code</div>
                </div>
              ) : (
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-lg font-semibold text-black">
                    No PIN Set
                  </div>
                  <div className="text-xs text-black/70 mt-1">Contact admin to set PIN</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Member Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black text-2xl font-bold">
                {memberData?.first_name?.[0]}
                {memberData?.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {memberData?.first_name} {memberData?.last_name}
                </h3>
                <p className="text-gray-300">{memberData?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Phone</span>
                <span className="font-medium text-white">
                  {memberData?.phone || "Not provided"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Join Date</span>
                <span className="font-medium text-white">
                  {formatDate(memberData?.start_date)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300">Expiry Date</span>
                <span
                  className={`font-medium ${
                    getMembershipStatus() === "Expired"
                      ? "text-red-600"
                      : getMembershipStatus() === "Expiring Soon"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {formatDate(memberData?.expiry_date)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Membership Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
          >
            <h3 className="text-xl font-bold text-white mb-6">
              Membership Details
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-calendar text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Monthly Fee
                  </span>
                </div>
                <span className="font-bold text-yellow-400">
                  {memberData?.monthly_fee ? `${memberData.monthly_fee} AFN` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-time text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Time Slot
                  </span>
                </div>
                <span className="font-bold text-yellow-400 capitalize">
                  {memberData?.time_slot || 'Not specified'}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <i className="bx bx-box text-yellow-400 text-xl"></i>
                  <span className="font-medium text-white">
                    Box Number
                  </span>
                </div>
                <span className="font-bold text-yellow-400">
                  {memberData?.box_number || 'Not assigned'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Membership Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-700 rounded-xl shadow-sm p-6 border border-gray-600"
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Membership Progress
          </h3>

          <div className="space-y-6">
            {/* Days Remaining Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-300">Days Remaining</span>
                <span className="text-sm font-bold text-yellow-400">{getDaysRemaining()} days</span>
              </div>
              <div className="w-full bg-gray-600/30 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((getDaysRemaining() / 30) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Membership Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-600 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{getDaysSinceJoining()}</div>
                <div className="text-sm text-gray-300">Days as Member</div>
              </div>
              <div className="text-center p-4 bg-gray-600 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {getMembershipStatus() === 'Active' ? '✓' : getMembershipStatus() === 'Expiring Soon' ? '⚠' : '✗'}
                </div>
                <div className="text-sm text-gray-300">Status</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MemberDashboardPage;
