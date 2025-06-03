// src/components/MemberCheckInStatus.jsx
import React, { useState } from 'react';
import axios from 'axios';

const MemberCheckInStatus = () => {
  const [memberId, setMemberId] = useState('');
  const [memberStatus, setMemberStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = 'http://127.0.0.1:8000';

  const checkMemberStatus = async () => {
    if (!memberId) {
      setError('Please enter a member ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMemberStatus(null);

      const response = await axios.get(`${API_BASE_URL}/api/members/${memberId}/check-in-status/`);
      
      console.log('Member status response:', response.data);
      setMemberStatus(response.data);
    } catch (err) {
      console.error('Error checking member status:', err);
      let errorMessage = 'Failed to check member status';
      
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'Member not found';
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
    <div className="member-check-in-status p-4 border rounded bg-white">
      <h2 className="text-xl font-semibold mb-4">Member Check-in Status</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter Member ID"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="px-3 py-2 border rounded flex-grow"
        />
        <button
          onClick={checkMemberStatus}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}
      
      {memberStatus && (
        <div className={`p-4 rounded ${memberStatus.checked_in ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <div className="font-semibold text-lg">
            {memberStatus.member_name} (ID: {memberStatus.member_id})
          </div>
          <div className="mt-2">
            {memberStatus.checked_in 
              ? `Checked in today at ${memberStatus.check_in_time}`
              : 'Not checked in today'}
          </div>
          {memberStatus.membership_status && (
            <div className="mt-2">
              Membership Status: {memberStatus.membership_status}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberCheckInStatus;
