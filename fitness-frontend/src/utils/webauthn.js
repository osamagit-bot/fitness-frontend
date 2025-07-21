// WebAuthn utility functions for fingerprint authentication

/**
 * Convert ArrayBuffer to base64url string
 */
export function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url string to ArrayBuffer
 */
export function base64urlToArrayBuffer(base64url) {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const padLength = (4 - base64.length % 4) % 4;
  const paddedBase64 = base64 + '='.repeat(padLength);
  
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported() {
  return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get);
}

/**
 * Check if the current platform supports authenticators (like fingerprint sensors)
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) {
    return false;
  }
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (error) {
    console.error('Error checking platform authenticator availability:', error);
    return false;
  }
}

/**
 * Register a new WebAuthn credential (fingerprint)
 */
export async function registerCredential(options) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    // Convert base64url strings to ArrayBuffers
    const credentialOptions = {
      ...options,
      challenge: base64urlToArrayBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64urlToArrayBuffer(options.user.id)
      }
    };

    // Create the credential
    const credential = await navigator.credentials.create({
      publicKey: credentialOptions
    });

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    // Convert response to a format that can be sent to the server
    return {
      id: credential.id,
      rawId: arrayBufferToBase64url(credential.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64url(credential.response.clientDataJSON),
        attestationObject: arrayBufferToBase64url(credential.response.attestationObject),
      },
      type: credential.type,
    };
  } catch (error) {
    console.error('WebAuthn registration error:', error);
    throw error;
  }
}

/**
 * Authenticate using an existing WebAuthn credential
 */
export async function authenticateCredential(options) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    // Convert base64url strings to ArrayBuffers
    const credentialOptions = {
      ...options,
      challenge: base64urlToArrayBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map(cred => ({
        ...cred,
        id: typeof cred.id === 'string' ? base64urlToArrayBuffer(cred.id) : cred.id
      }))
    };

    // Get the credential
    const assertion = await navigator.credentials.get({
      publicKey: credentialOptions
    });

    if (!assertion) {
      throw new Error('Failed to authenticate');
    }

    // Convert response to a format that can be sent to the server
    return {
      id: assertion.id,
      rawId: arrayBufferToBase64url(assertion.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64url(assertion.response.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(assertion.response.authenticatorData),
        signature: arrayBufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? arrayBufferToBase64url(assertion.response.userHandle) : null,
      },
      type: assertion.type,
    };
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    throw error;
  }
}

/**
 * Simplified authentication for kiosk mode - prompts for any registered fingerprint
 */
export async function kioskAuthenticate(abortSignal = null) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  try {
    // Create a simple authentication request that allows any credential
    const options = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [], // Empty array allows any registered credential
      userVerification: 'required',
      timeout: 30000
    };

    // Get the credential with optional abort signal
    const credentialsOptions = {
      publicKey: options
    };
    
    if (abortSignal) {
      credentialsOptions.signal = abortSignal;
    }

    const assertion = await navigator.credentials.get(credentialsOptions);

    if (!assertion) {
      throw new Error('Failed to authenticate');
    }

    // Convert response to a format that can be sent to the server
    return {
      id: assertion.id,
      rawId: arrayBufferToBase64url(assertion.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64url(assertion.response.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(assertion.response.authenticatorData),
        signature: arrayBufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? arrayBufferToBase64url(assertion.response.userHandle) : null,
      },
      type: assertion.type,
    };
  } catch (error) {
    console.error('Kiosk authentication error:', error);
    throw error;
  }
}

/**
 * Generate a random challenge for WebAuthn
 */
export function generateChallenge() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return arrayBufferToBase64url(array);
}

/**
 * Create default registration options for WebAuthn
 */
export function createRegistrationOptions(userId, userName, userDisplayName) {
  return {
    challenge: generateChallenge(),
    rp: {
      name: 'Elite Fitness Club',
      id: window.location.hostname,
    },
    user: {
      id: arrayBufferToBase64url(new TextEncoder().encode(userId)),
      name: userName,
      displayName: userDisplayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: 'direct',
  };
}

/**
 * Create default authentication options for WebAuthn
 */
export function createAuthenticationOptions(allowCredentials = []) {
  return {
    challenge: generateChallenge(),
    allowCredentials: allowCredentials.map(cred => ({
      type: 'public-key',
      id: cred.id,
    })),
    userVerification: 'required',
    timeout: 60000,
  };
}
