import { useState } from 'react';
import axios from 'axios';

const BiometricRegistration = ({ memberId, onSuccess, onCancel }) => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const startRegistration = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      // 1. Get registration options from backend
      const optionsRes = await axios.post(
        'https://fitness-frontend-0ri3.onrender.com/api/biometrics/webauthn/register-options/',
        { athlete_id: memberId },
        { withCredentials: true }
      );
      const options = optionsRes.data.options;

      // 2. Call WebAuthn API (browser)
      const publicKey = {
        ...options,
        challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
        user: {
          ...options.user,
          id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
        },
      };
      const credential = await navigator.credentials.create({ publicKey });

      // 3. Send registration result to backend
      const credentialData = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        type: credential.type,
        response: {
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        },
        athlete_id: memberId,
      };

      await axios.post(
        'https://fitness-frontend-0ri3.onrender.com/api/biometrics/webauthn/register-complete/',
        credentialData,
        { withCredentials: true }
      );

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.'
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Fingerprint Registration</h2>
      <div className="text-center mb-4">
        {status === 'idle' && <p>Ready to register fingerprint</p>}
        {status === 'loading' && <p>Please place your finger on the scanner...</p>}
        {status === 'success' && <p>Fingerprint registered successfully!</p>}
        {status === 'error' && <p className="text-red-500">{errorMessage}</p>}
      </div>
      <div className="flex justify-center space-x-4">
        {status === 'idle' && (
          <button
            onClick={startRegistration}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Register Fingerprint
          </button>
        )}
        {status === 'success' && (
          <button
            onClick={onSuccess}
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

export default BiometricRegistration;
