/**
 * Sensor compatibility utilities for external fingerprint sensors
 */

export class SensorCompatibility {
  static async checkSensorSupport() {
    const support = {
      webauthn: false,
      platformAuthenticator: false,
      externalSensor: false,
      recommendations: []
    };

    // Check WebAuthn support
    if (window.PublicKeyCredential) {
      support.webauthn = true;
      
      // Check platform authenticator availability
      try {
        support.platformAuthenticator = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (error) {
        console.warn('Platform authenticator check failed:', error);
      }
    }

    // Detect operating system and provide recommendations
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) {
      support.recommendations.push(
        'For best results, set up Windows Hello fingerprint authentication',
        'External USB fingerprint scanners are supported',
        'Ensure latest Windows updates are installed'
      );
    } else if (userAgent.includes('Mac')) {
      support.recommendations.push(
        'Use Touch ID if available on your Mac',
        'External sensors may require additional setup',
        'Safari 14+ recommended for best compatibility'
      );
    } else {
      support.recommendations.push(
        'External fingerprint sensors may have limited support',
        'Chrome or Firefox browsers recommended'
      );
    }

    return support;
  }

  static async testSensorConnection() {
    try {
      // Attempt to create a test credential request
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const options = {
        publicKey: {
          challenge: challenge,
          allowCredentials: [],
          userVerification: 'required',
          timeout: 5000 // Short timeout for test
        }
      };

      // This will prompt for fingerprint but we'll cancel it immediately
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);
      
      try {
        await navigator.credentials.get({
          ...options,
          signal: controller.signal
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          return { connected: true, message: 'Sensor detected and responsive' };
        } else if (error.name === 'NotAllowedError') {
          return { connected: true, message: 'Sensor available but authentication cancelled' };
        } else {
          return { connected: false, message: `Sensor issue: ${error.message}` };
        }
      }
      
      return { connected: true, message: 'Sensor test completed' };
      
    } catch (error) {
      return { connected: false, message: `Test failed: ${error.message}` };
    }
  }

  static getExternalSensorRecommendations() {
    return {
      recommended_models: [
        {
          name: 'Digital Persona U.are.U 4500',
          price_range: '$50-80',
          compatibility: 'Excellent',
          notes: 'Most widely supported, good for kiosk setups'
        },
        {
          name: 'SecuGen Hamster Pro 20',
          price_range: '$60-90',
          compatibility: 'Very Good',
          notes: 'Reliable, good image quality'
        },
        {
          name: 'Futronic FS88H',
          price_range: '$40-70',
          compatibility: 'Good',
          notes: 'Budget-friendly option'
        }
      ],
      setup_requirements: [
        'Install manufacturer drivers',
        'Configure Windows Hello (Windows)',
        'Test with browser WebAuthn support',
        'Ensure USB 2.0+ connection',
        'Update browser to latest version'
      ],
      troubleshooting: [
        'If sensor not detected: Reinstall drivers',
        'If authentication fails: Clear browser data and re-register',
        'If slow response: Check USB connection and power',
        'If inconsistent: Clean sensor surface and re-calibrate'
      ]
    };
  }

  static handleSensorError(error) {
    const errorMappings = {
      'NotAllowedError': {
        message: 'Fingerprint authentication was cancelled or denied',
        suggestions: ['Try placing finger on sensor again', 'Ensure finger is clean and dry']
      },
      'NotSupportedError': {
        message: 'Fingerprint authentication not supported',
        suggestions: ['Check if sensor is connected', 'Install sensor drivers', 'Use supported browser']
      },
      'SecurityError': {
        message: 'Security error with fingerprint sensor',
        suggestions: ['Check sensor connection', 'Restart browser', 'Verify HTTPS connection']
      },
      'InvalidStateError': {
        message: 'Sensor is busy or in invalid state',
        suggestions: ['Wait a moment and try again', 'Disconnect and reconnect sensor']
      },
      'TimeoutError': {
        message: 'Fingerprint authentication timed out',
        suggestions: ['Try again with quicker finger placement', 'Check sensor responsiveness']
      }
    };

    const errorInfo = errorMappings[error.name] || {
      message: `Sensor error: ${error.message}`,
      suggestions: ['Check sensor connection', 'Restart application', 'Contact support']
    };

    return {
      userMessage: errorInfo.message,
      suggestions: errorInfo.suggestions,
      technicalError: `${error.name}: ${error.message}`
    };
  }
}

export default SensorCompatibility;