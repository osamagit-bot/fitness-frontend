import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../Config';
import PhotoCapture from './PhotoCapture';

const PinCheckIn = ({ onSuccess, onError }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [pin, loading]);

  const handleCheckIn = async (pinValue) => {
    const currentPin = pinValue || pin;
    if (!currentPin || currentPin.length < 4) {
      onError?.('Please enter a valid PIN (4-6 digits)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}pin/checkin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pin: currentPin,
          photo: capturedPhoto
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSuccess?.(data);
        setPin('');
      } else {
        onError?.(data.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('PIN check-in error:', error);
      onError?.(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const newPin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(newPin);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Auto check-in after PIN reaches 4+ digits and photo is captured
    if (newPin.length >= 4 && !loading && capturedPhoto) {
      timeoutRef.current = setTimeout(() => {
        handleCheckIn(newPin);
      }, 1000);
    }
  };

  const handlePhotoCapture = (photo) => {
    setCapturedPhoto(photo);
    // If PIN is ready and photo captured, trigger check-in
    if (pin.length >= 4 && !loading) {
      setTimeout(() => handleCheckIn(pin), 500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCheckIn();
    }
  };

  return (
    <div className="pin-checkin bg-gray-800 p-6 rounded-lg shadow-md border border-gray-600">
      <h3 className="text-xl font-semibold mb-4 text-white">PIN Check-in</h3>
      <div className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={pin}
          onChange={handlePinChange}
          onKeyPress={handleKeyPress}
          onBlur={() => inputRef.current?.focus()}
          placeholder="Enter your PIN"
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none"
          maxLength="6"
          disabled={loading}
          autoFocus
        />
        {loading && (
          <div className="w-full bg-gray-700 text-white py-3 rounded-lg text-center">
            Checking in...
          </div>
        )}
        <div className="text-center text-sm mt-2">
          {capturedPhoto ? (
            <span className="text-green-400">✓ Photo captured</span>
          ) : (
            <span className="text-yellow-400">📷 Taking photo...</span>
          )}
        </div>
      </div>
      <PhotoCapture 
        onPhotoCapture={handlePhotoCapture}
        isVisible={true}
      />
    </div>
  );
};

export default PinCheckIn;