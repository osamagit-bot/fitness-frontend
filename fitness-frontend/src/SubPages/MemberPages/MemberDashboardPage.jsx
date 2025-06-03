// src/SubPages/MemberPages/MemberDashboardPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const MemberDashboardPage = () => {
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await axios.get(`fitness-frontend-0ri3.onrender.com/api/members/${userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setMemberData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching member data:', err);
        setError('Failed to load your profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchMemberData();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const getMembershipStatus = () => {
    if (!memberData?.expiry_date) return 'Unknown';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(memberData.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate > today) {
      const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 7 ? 'Expiring Soon' : 'Active';
    } else {
      return 'Expired';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeSlot = (slot) => {
    if (!slot) return 'Not specified';
    return slot.charAt(0).toUpperCase() + slot.slice(1);
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const membershipStatus = memberData ? getMembershipStatus() : 'Unknown';
  const daysRemaining = getDaysRemaining();
  const statusColorClass = getStatusColorClass(membershipStatus);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Logout Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg shadow"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"
        >
          <p>{error}</p>
        </motion.div>
      ) : (
        <>
          {/* Welcome and Status */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, {memberData?.first_name || 'Member'}
              </h1>
              <p className="text-gray-600 mt-1">
                Member ID: <span className="font-semibold">{memberData?.athlete_id || 'N/A'}</span>
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${statusColorClass}`}>
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    membershipStatus === 'Active'
                      ? 'bg-green-500'
                      : membershipStatus === 'Expiring Soon'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span className="font-medium">{membershipStatus}</span>
              </div>
            </div>
          </motion.div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-xl shadow-md border border-yellow-200 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Membership Type</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800 capitalize">
                  {memberData?.membership_type || 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Monthly Fee</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {memberData?.monthly_fee
                    ? `${parseFloat(memberData.monthly_fee).toFixed(2)} AFN`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Time Slot</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-800">
                  {formatTimeSlot(memberData?.time_slot)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Member Info & Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Membership Status */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Membership Status
              </h2>
              <div className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div
                    className={`p-2 ${
                      membershipStatus === 'Active'
                        ? 'bg-green-100 text-green-600'
                        : membershipStatus === 'Expiring Soon'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                    } rounded-md mr-3`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Status</p>
                    <p className="text-lg font-medium">{membershipStatus}</p>
                  </div>
                </div>

                {/* Start/Expiry Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-lg font-medium">{formatDate(memberData?.start_date)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Expiry Date</p>
                    <p className="text-lg font-medium">{formatDate(memberData?.expiry_date)}</p>
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Days Remaining</p>
                  <p className="text-lg font-medium">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</p>
                </div>

                {membershipStatus === 'Expired' && (
                  <div className="mt-4">
                    <a
                      href="/contact"
                      className="w-full inline-block text-center bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg shadow transition-colors"
                    >
                      Contact Admin to Renew
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Member Info */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Member Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-lg font-medium">
                      {memberData?.first_name || ''} {memberData?.last_name || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Box Number</p>
                    <p className="text-lg font-medium">{memberData?.box_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Time Slot</p>
                    <p className="text-lg font-medium">{formatTimeSlot(memberData?.time_slot)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monthly Fee</p>
                    <p className="text-lg font-medium">{memberData?.monthly_fee || 'N/A'} AFN</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Biometric Status</p>
                  <p className="text-lg font-medium">
                    {memberData?.biometric_registered ? 'Registered' : 'Not Registered'}
                  </p>
                </div>

                <div className="mt-4">
                  <a
                    href="/member-dashboard/profile"
                    className="w-full inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg shadow transition-colors"
                  >
                    View Full Profile
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default MemberDashboardPage;
