import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFingerprint, faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

// API base URL
const API_BASE_URL = 'http://127.0.0.1:8000';

// Helper functions for ArrayBuffer conversion
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const BiometricCheckIn = ({ memberId, onSuccess, onCancel }) => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedMember, setVerifiedMember] = useState(null);
  
  // Debug log to check if memberId is being passed correctly
  useEffect(() => {
    console.log("BiometricCheckIn received memberId:", memberId);
  }, [memberId]);
  
  const startVerification = async () => {
    if (!memberId) {
      setStatus('error');
      setErrorMessage('Member ID is required');
      return;
    }
    
    try {
      setStatus('loading');
      setErrorMessage('');
      
      console.log("Starting fingerprint verification for member ID:", memberId);
      
      // 1. Get authentication options from server
      const optionsResponse = await axios.post(`${API_BASE_URL}/api/biometrics/webauthn/auth-options/`, {
        athlete_id: memberId  // Use athlete_id as that's what the backend expects
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log("Authentication options response:", optionsResponse.data);
      
      if (optionsResponse.data.status === 'error') {
        throw new Error(optionsResponse.data.message);
      }
      
      const options = optionsResponse.data;
      
      // Transform the options for the browser's WebAuthn API
      options.publicKey.challenge = base64ToArrayBuffer(options.publicKey.challenge);
      
      // Log original RP ID for debugging
      console.log("Original RP ID:", options.publicKey.rpId);
      
      // For development environment, force the RP ID to match frontend
      console.log("Original rpId:", options.publicKey.rpId);
options.publicKey.rpId = window.location.hostname;
console.log("Set rpId to match current hostname:", options.publicKey.rpId);


      if (options.publicKey.allowCredentials) {
        options.publicKey.allowCredentials = options.publicKey.allowCredentials.map(cred => ({
          ...cred,
          id: base64ToArrayBuffer(cred.id)
        }));
      }
      
      console.log("Requesting fingerprint verification with options:", options);
      
      // 2. Request the credential from the browser
      const credential = await navigator.credentials.get(options);
      
      console.log("Received credential from browser:", credential);
      
      // 3. Transform the credential for sending to server
      const transformedCredential = {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(credential.response.authenticatorData),
          signature: arrayBufferToBase64(credential.response.signature),
          userHandle: credential.response.userHandle ? 
            arrayBufferToBase64(credential.response.userHandle) : null
        }
      };
      
      console.log("Transformed credential:", transformedCredential);
      
      // 4. Send the credential to the server for verification
      const verificationResponse = await axios.post(`${API_BASE_URL}/api/biometrics/webauthn/check-in/`, {
        athlete_id: memberId,
        credential: transformedCredential,
        rp_id: window.location.hostname // Add this line
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log("Check-in verification response:", verificationResponse.data);
      
      if (verificationResponse.data.status === 'error') {
        throw new Error(verificationResponse.data.message);
      }
      
      console.log("Verification successful:", verificationResponse.data);
      
      setStatus('success');
      setVerifiedMember(verificationResponse.data.member);
      
      if (onSuccess) onSuccess(verificationResponse.data.member);
      
    } catch (error) {
      console.error("Error during fingerprint verification:", error);
      setStatus('error');
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to verify fingerprint');
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Fingerprint Check-In</h2>
      
      <div className="flex justify-center items-center mb-4">
        {status === 'idle' && (
          <FontAwesomeIcon icon={faFingerprint} size="5x" className="text-blue-500" />
        )}
        {status === 'loading' && (
          <FontAwesomeIcon icon={faSpinner} spin size="5x" className="text-blue-500" />
        )}
        {status === 'success' && (
          <FontAwesomeIcon icon={faCheck} size="5x" className="text-green-500" />
        )}
        {status === 'error' && (
          <FontAwesomeIcon icon={faTimes} size="5x" className="text-red-500" />
        )}
      </div>
      
      <div className="text-center mb-4">
        {status === 'idle' && <p>Ready to verify fingerprint</p>}
        {status === 'loading' && <p>Please place your finger on the scanner...</p>}
        {status === 'success' && (
          <div>
            <p>Fingerprint verified successfully!</p>
            {verifiedMember && (
              <p className="font-semibold mt-2">
                Welcome, {verifiedMember.first_name} {verifiedMember.last_name}
              </p>
            )}
          </div>
        )}
        {status === 'error' && <p className="text-red-500">{errorMessage}</p>}
      </div>
      
      <div className="flex justify-center space-x-4">
        {status === 'idle' && (
          <button
            onClick={startVerification}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Verify Fingerprint
          </button>
        )}
        
        {status === 'success' && (
          <button
            onClick={() => onSuccess && onSuccess(verifiedMember)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Continue
          </button>
        )}
        
        {(status === 'idle' || status === 'error') && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default BiometricCheckIn;
