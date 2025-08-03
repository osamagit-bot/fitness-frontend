/**
 * Smart Biometric Authentication System
 * Automatically detects and uses the best available authentication method:
 * 1. External USB fingerprint sensors (highest priority)
 * 2. Windows Hello/WebAuthn (fallback)
 * 3. PIN + Photo (final fallback)
 */

import { externalSensorManager } from './externalSensorManager.js';
import { kioskAuthenticate, isWebAuthnSupported } from './webauthn.js';
import { publicApi } from './api.js';

class SmartBiometricAuth {
  constructor() {
    this.authMethod = null;
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Initialize the authentication system
   * Auto-detects the best available method
   */
  async initialize() {
    console.log('🚀 Initializing Smart Biometric Authentication...');
    
    try {
      // Check for external sensors first (highest priority)
      const externalSensor = await externalSensorManager.detectSensors();
      
      if (externalSensor) {
        this.authMethod = {
          type: 'external_sensor',
          name: externalSensor.name,
          sensor: externalSensor,
          priority: 1
        };
        console.log(`✅ Using external sensor: ${externalSensor.name}`);
      }
      // Fallback to WebAuthn if no external sensor
      else if (isWebAuthnSupported()) {
        this.authMethod = {
          type: 'webauthn',
          name: 'Windows Hello / WebAuthn',
          priority: 2
        };
        console.log('✅ Using WebAuthn authentication');
      }
      // Final fallback to PIN
      else {
        this.authMethod = {
          type: 'pin',
          name: 'PIN + Photo',
          priority: 3
        };
        console.log('✅ Using PIN authentication');
      }
      
      this.isInitialized = true;
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.authMethod);
        } catch (error) {
          console.error('Error in auth method listener:', error);
        }
      });
      
      return this.authMethod;
      
    } catch (error) {
      console.error('Failed to initialize authentication system:', error);
      throw error;
    }
  }

  /**
   * Start continuous authentication for kiosk mode
   */
  async startKioskAuthentication(onSuccessCallback, onErrorCallback) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`🔄 Starting kiosk authentication with: ${this.authMethod.name}`);
    
    switch (this.authMethod.type) {
      case 'external_sensor':
        return await this.startExternalSensorAuth(onSuccessCallback, onErrorCallback);
      case 'webauthn':
        return await this.startWebAuthnAuth(onSuccessCallback, onErrorCallback);
      case 'pin':
        // PIN mode requires user interaction, so we don't start automatically
        console.log('📌 PIN mode active - waiting for user interaction');
        return { mode: 'pin', message: 'PIN mode active' };
      default:
        throw new Error('No authentication method available');
    }
  }

  /**
   * External sensor authentication
   */
  async startExternalSensorAuth(onSuccessCallback, onErrorCallback) {
    try {
      console.log('🔍 Starting external sensor authentication...');
      
      await externalSensorManager.startScanning(
        async (fingerprintData) => {
          try {
            console.log('👆 Fingerprint detected from external sensor');
            
            // Send fingerprint data to backend for member identification
            const response = await publicApi.post('webauthn/kiosk/external-sensor/', {
              fingerprint_data: fingerprintData.data,
              sensor_type: fingerprintData.sensor,
              quality: fingerprintData.quality
            });
            
            if (response.data.success) {
              console.log(`✅ Member identified: ${response.data.member.name}`);
              onSuccessCallback(response.data);
            } else {
              console.log('❌ Fingerprint not recognized');
              onErrorCallback(new Error('Fingerprint not recognized'));
            }
            
          } catch (error) {
            console.error('External sensor authentication error:', error);
            onErrorCallback(error);
          }
        },
        (error) => {
          console.error('External sensor scanning error:', error);
          onErrorCallback(error);
        }
      );
      
      return { 
        mode: 'external_sensor', 
        sensor: this.authMethod.sensor.name,
        message: 'Scanning for fingerprint...' 
      };
      
    } catch (error) {
      console.error('Failed to start external sensor auth:', error);
      
      // Fallback to WebAuthn if external sensor fails
      console.log('🔄 Falling back to WebAuthn...');
      this.authMethod.type = 'webauthn';
      return await this.startWebAuthnAuth(onSuccessCallback, onErrorCallback);
    }
  }

  /**
   * WebAuthn authentication (Windows Hello)
   */
  async startWebAuthnAuth(onSuccessCallback, onErrorCallback) {
    try {
      console.log('🔍 Starting WebAuthn authentication...');
      
      // Use the existing kioskAuthenticate function
      const assertion = await kioskAuthenticate();
      
      // Send assertion to backend
      const response = await publicApi.post("webauthn/kiosk/checkin/", {
        assertion: assertion,
      });
      
      if (response.data.success) {
        console.log(`✅ Member authenticated: ${response.data.member.name}`);
        onSuccessCallback(response.data);
      } else {
        onErrorCallback(new Error('Authentication failed'));
      }
      
      return { 
        mode: 'webauthn', 
        message: 'WebAuthn authentication successful' 
      };
      
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      onErrorCallback(error);
      
      return { 
        mode: 'webauthn_error', 
        message: error.message 
      };
    }
  }

  /**
   * Stop authentication
   */
  stopAuthentication() {
    console.log('⏹️ Stopping authentication...');
    
    if (this.authMethod?.type === 'external_sensor') {
      externalSensorManager.stopScanning();
    }
  }

  /**
   * Get current authentication status
   */
  getAuthStatus() {
    return {
      isInitialized: this.isInitialized,
      authMethod: this.authMethod,
      externalSensorInfo: externalSensorManager.getSensorInfo(),
      webauthnSupported: isWebAuthnSupported()
    };
  }

  /**
   * Manually authenticate with specific method
   */
  async authenticateWith(method, data = {}) {
    switch (method) {
      case 'external_sensor':
        if (!externalSensorManager.activeSensor) {
          throw new Error('No external sensor available');
        }
        return await this.authenticateExternalSensor(data);
        
      case 'webauthn':
        return await this.authenticateWebAuthn(data);
        
      case 'pin':
        return await this.authenticatePin(data);
        
      default:
        throw new Error(`Unknown authentication method: ${method}`);
    }
  }

  /**
   * Manual external sensor authentication
   */
  async authenticateExternalSensor(data) {
    // This would typically be called when we have fingerprint data
    // from a one-time scan rather than continuous scanning
    
    const response = await publicApi.post('webauthn/kiosk/external-sensor/', {
      fingerprint_data: data.fingerprintData,
      sensor_type: data.sensorType || 'unknown',
      quality: data.quality || 'good'
    });
    
    return response.data;
  }

  /**
   * Manual WebAuthn authentication
   */
  async authenticateWebAuthn(data) {
    const assertion = await kioskAuthenticate(data.abortSignal);
    
    const response = await publicApi.post("webauthn/kiosk/checkin/", {
      assertion: assertion,
    });
    
    return response.data;
  }

  /**
   * Manual PIN authentication
   */
  async authenticatePin(data) {
    if (!data.pin || !data.photo) {
      throw new Error('PIN and photo are required');
    }
    
    const response = await publicApi.post('pin_checkin/', {
      pin: data.pin,
      photo: data.photo
    });
    
    return response.data;
  }

  /**
   * Test all available authentication methods
   */
  async testAllMethods() {
    const results = {
      external_sensor: null,
      webauthn: null,
      pin: null
    };
    
    // Test external sensor
    try {
      if (externalSensorManager.activeSensor) {
        const sensorTest = await externalSensorManager.testSensor();
        results.external_sensor = {
          available: true,
          status: sensorTest.status,
          message: sensorTest.message,
          sensor: externalSensorManager.activeSensor.name
        };
      } else {
        results.external_sensor = {
          available: false,
          message: 'No external sensor detected'
        };
      }
    } catch (error) {
      results.external_sensor = {
        available: false,
        error: error.message
      };
    }
    
    // Test WebAuthn
    try {
      results.webauthn = {
        available: isWebAuthnSupported(),
        message: isWebAuthnSupported() 
          ? 'WebAuthn supported' 
          : 'WebAuthn not supported'
      };
    } catch (error) {
      results.webauthn = {
        available: false,
        error: error.message
      };
    }
    
    // PIN is always available
    results.pin = {
      available: true,
      message: 'PIN authentication always available'
    };
    
    return results;
  }

  /**
   * Add listener for authentication method changes
   */
  onAuthMethodChange(listener) {
    this.listeners.push(listener);
    
    // If already initialized, call listener immediately
    if (this.isInitialized && this.authMethod) {
      listener(this.authMethod);
    }
  }

  /**
   * Force re-detection of authentication methods
   */
  async refresh() {
    console.log('🔄 Refreshing authentication methods...');
    this.isInitialized = false;
    this.authMethod = null;
    return await this.initialize();
  }
}

// Create singleton instance
export const smartBiometricAuth = new SmartBiometricAuth();

// Auto-initialize
smartBiometricAuth.initialize().catch(console.error);

export default SmartBiometricAuth;
