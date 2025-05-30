// src/components/TestMemberCreator.jsx
import React, { useState } from 'react';
import axios from 'axios';

const TestMemberCreator = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [athleteId, setAthleteId] = useState('20'); // Default to ID 20 as in the QR
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('Member');
  
  const API_BASE_URL = 'http://127.0.0.1:8000';
  
  const createTestMember = async () => {
    try {
      setLoading(true);
      setStatus(null);
      
      // Directly create a member in the database using Django admin API
      const response = await axios.post(
        `${API_BASE_URL}/api/add-test-member/`,
        { 
          athlete_id: athleteId,
          first_name: firstName,
          last_name: lastName,
          membership_type: 'fitness',
          box_number: '101',
          time_slot: 'morning'
        }
      );
      
      console.log("Test member creation response:", response.data);
      
      setStatus({
        success: true,
        message: response.data.message || "Test member created successfully"
      });
      
    } catch (err) {
      console.error("Error creating test member:", err);
      
      let errorMessage = "Failed to create test member";
      if (err.response && err.response.data) {
        errorMessage = err.response.data.message || err.response.data.error || errorMessage;
      }
      
      setStatus({
        success: false,
        message: errorMessage
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="text-lg font-medium mb-4">Create Test Member</h3>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="md:w-1/3">
          <label className="block text-sm font-medium mb-1">Athlete ID</label>
          <input
            type="text"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div className="md:w-1/3">
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div className="md:w-1/3">
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={createTestMember}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Test Member"}
        </button>
        
        {status && (
          <div className={`p-2 rounded text-sm ${status.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {status.message}
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        This creates a test member for QR scanning. Use QR code with text "Member ID: {athleteId}".
      </div>
    </div>
  );
};

export default TestMemberCreator;