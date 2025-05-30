// In your QRScanner.jsx or similar component
import React, { useState, useRef, useEffect } from 'react';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startScanning = async () => {
    try {
      // Stop any existing streams first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsScanning(true);
      
      // Start QR detection here
      // ...
      
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">QR Code Scanner</h2>
      
      {!isScanning ? (
        <div className="text-center mb-4">
          <button 
            onClick={startScanning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Scanner
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-4 border rounded overflow-hidden">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline
              style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }}
            />
          </div>
          
          <button 
            onClick={stopScanning}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Scanning
          </button>
        </>
      )}
    </div>
  );
};

export default QRScanner;