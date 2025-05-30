// src/components/TestCamera.jsx
import React, { useEffect, useRef, useState } from 'react';

const TestCamera = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasStarted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setHasStarted(false);
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Camera Test</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        {!hasStarted ? (
          <button 
            onClick={startCamera}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Start Camera
          </button>
        ) : (
          <button 
            onClick={stopCamera}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Stop Camera
          </button>
        )}
      </div>
      
      <div className="border border-gray-300 rounded overflow-hidden" style={{ height: '300px' }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          width="100%"
          height="100%"
          style={{ backgroundColor: '#000' }}
        />
      </div>
      
      {hasStarted && (
        <div className="mt-4 text-green-600">
          Camera should be visible above. If you don't see it, check your browser permissions.
        </div>
      )}
    </div>
  );
};

export default TestCamera;