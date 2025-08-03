import React, { useState } from 'react';
import { API_BASE_URL } from '../Config';
import PhotoCapture from './PhotoCapture';

const PinManagement = ({ member, onUpdate, onClose }) => {
  const [pin, setPin] = useState('');
  const [enablePin, setEnablePin] = useState(member?.pin_enabled || false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const handleSetPin = async () => {
    if (!pin || pin.length < 4) {
      setMessage('PIN must be 4-6 digits');
      return;
    }
    
    if (!capturedPhoto) {
      setMessage('Reference photo is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}pin/set/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: member.athlete_id,
          pin: pin,
          photo: capturedPhoto,
          enable_pin: enablePin
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`PIN ${enablePin ? 'enabled' : 'disabled'} successfully`);
        onUpdate?.(data.member);
        setTimeout(() => onClose?.(), 2000);
      } else {
        setMessage(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border border-gray-600">
        <h3 className="text-xl font-semibold mb-4 text-white">
          PIN Management - {member?.first_name} {member?.last_name}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              PIN (4-6 digits)
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter PIN"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-center tracking-widest placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
              maxLength="6"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enablePin"
              checked={enablePin}
              onChange={(e) => setEnablePin(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="enablePin" className="text-sm text-gray-300">
              Enable PIN check-in for this member
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reference Photo
            </label>
            <div className="text-center text-sm mb-2">
              {capturedPhoto ? (
                <span className="text-green-400">✓ Photo captured</span>
              ) : (
                <span className="text-yellow-400">📷 Taking photo...</span>
              )}
            </div>
            <PhotoCapture 
              onPhotoCapture={setCapturedPhoto}
              isVisible={true}
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
              {message}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleSetPin}
              disabled={loading || !pin || !capturedPhoto}
              className="flex-1 bg-yellow-600 text-black py-2 rounded-md font-medium hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400"
            >
              {loading ? 'Setting...' : 'Set PIN & Photo'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 rounded-md font-medium hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinManagement;