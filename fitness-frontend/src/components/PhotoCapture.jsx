import React, { useRef, useEffect, useState } from 'react';

const PhotoCapture = ({ onPhotoCapture, isVisible = true, forceVisible = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const shouldBeVisible = isVisible || forceVisible;
    console.log('PhotoCapture visibility changed:', shouldBeVisible, 'isVisible:', isVisible, 'forceVisible:', forceVisible);
    if (shouldBeVisible) {
      console.log('Starting camera for photo capture...');
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isVisible, forceVisible]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
        };
        
        videoRef.current.oncanplay = () => {
          setStream(mediaStream);
          setIsReady(true);
          console.log('Camera ready and can play - auto capturing in 2 seconds...');
          
          // Auto-capture after camera is ready
          setTimeout(() => {
            const photo = capturePhoto();
            if (photo) {
              console.log('Auto photo captured, size:', photo.length);
              onPhotoCapture(photo);
            }
          }, 2000);
        };
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      // Use fallback photo immediately
      console.log('Using fallback photo');
      if (onPhotoCapture) {
        onPhotoCapture('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsReady(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 3) {
      console.log('Video not ready:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime
      });
      return null;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Fill with white background first
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame at actual size
    try {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    } catch (error) {
      console.error('Error drawing video to canvas:', error);
      return null;
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    console.log('Photo captured:', {
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      canvasSize: `${canvas.width}x${canvas.height}`,
      dataLength: dataUrl.length
    });
    return dataUrl;
  };

  // Expose capture function to parent and listen for events
  useEffect(() => {
    if (onPhotoCapture) {
      // Add capture method to window for manual triggering
      window.capturePhotoNow = () => {
        console.log('capturePhotoNow called, isReady:', isReady);
        if (isReady) {
          const photo = capturePhoto();
          if (photo) {
            console.log('Manual photo captured, size:', photo.length);
            onPhotoCapture(photo);
          } else {
            console.log('Photo capture failed, retrying...');
            setTimeout(() => {
              const retryPhoto = capturePhoto();
              if (retryPhoto) {
                console.log('Retry photo captured, size:', retryPhoto.length);
                onPhotoCapture(retryPhoto);
              }
            }, 1000);
          }
        } else {
          console.log('Camera not ready, starting camera first...');
          startCamera().then(() => {
            setTimeout(() => {
              const photo = capturePhoto();
              if (photo) {
                console.log('Photo captured after camera start, size:', photo.length);
                onPhotoCapture(photo);
              }
            }, 2000);
          });
        }
      };
      
      // Listen for custom events
      const handleTriggerCapture = () => {
        if (window.capturePhotoNow) {
          window.capturePhotoNow();
        }
      };
      
      window.addEventListener('triggerPhotoCapture', handleTriggerCapture);
      
      return () => {
        window.removeEventListener('triggerPhotoCapture', handleTriggerCapture);
      };
    }
  }, [isReady, onPhotoCapture]);

  if (!isVisible && !forceVisible) return null;

  return (
    <div className="photo-capture" style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000, border: '2px solid red' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '160px', height: '120px' }}
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
      <div style={{ color: 'white', fontSize: '12px' }}>
        Camera: {isReady ? 'Ready' : 'Loading...'}
      </div>
    </div>
  );
};

export default PhotoCapture;