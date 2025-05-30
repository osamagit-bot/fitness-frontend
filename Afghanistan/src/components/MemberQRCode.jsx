// src/components/MemberQRCode.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MemberQRCode = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const memberId = localStorage.getItem('memberId');

  useEffect(() => {
    const fetchQRCode = async () => {
      if (!memberId) {
        setError('Member ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/members/${memberId}/qrcode-data-url/`);
        setQrCodeUrl(response.data.qr_code_data_url);
        setLoading(false);
      } catch (err) {
        setError('Failed to load QR code');
        setLoading(false);
        console.error('Error fetching QR code:', err);
      }
    };

    fetchQRCode();
  }, [memberId]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `member-qrcode-${memberId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="text-center p-4">Loading QR code...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg shadow-md bg-white">
      <h2 className="text-xl font-semibold mb-4">Your Gym Check-in QR Code</h2>
      <div className="mb-4">
        <img 
          src={qrCodeUrl} 
          alt="Member QR Code" 
          className="w-64 h-64"
        />
      </div>
      <p className="mb-4 text-center text-gray-600">
        Present this QR code at the gym entrance for quick check-in
      </p>
      <button 
        onClick={handleDownload}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
      >
        Download QR Code
      </button>
    </div>
  );
};

export default MemberQRCode;