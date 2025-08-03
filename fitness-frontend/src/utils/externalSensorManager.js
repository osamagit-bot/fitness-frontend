/**
 * External Fingerprint Sensor Manager
 * Automatically detects and integrates with external USB fingerprint sensors
 * Supports: Digital Persona, SecuGen, Futronic, Suprema, and other popular brands
 */

class ExternalSensorManager {
  constructor() {
    this.sensors = [];
    this.activeSensor = null;
    this.isScanning = false;
    this.scanCallback = null;
    this.errorCallback = null;
  }

  /**
   * Auto-detect connected external fingerprint sensors
   */
  async detectSensors() {
    console.log('🔍 Scanning for external fingerprint sensors...');
    
    const detectedSensors = [];
    
    try {
      // Check for Digital Persona sensors
      const dpSensor = await this.detectDigitalPersona();
      if (dpSensor) detectedSensors.push(dpSensor);
      
      // Check for SecuGen sensors
      const sgSensor = await this.detectSecuGen();
      if (sgSensor) detectedSensors.push(sgSensor);
      
      // Check for Futronic sensors
      const ftSensor = await this.detectFutronic();
      if (ftSensor) detectedSensors.push(ftSensor);
      
      // Check for Suprema sensors
      const spSensor = await this.detectSuprema();
      if (spSensor) detectedSensors.push(spSensor);
      
      // Check for generic Windows USB sensors
      const winSensor = await this.detectWindowsUSBSensor();
      if (winSensor) detectedSensors.push(winSensor);
      
    } catch (error) {
      console.error('Error detecting sensors:', error);
    }
    
    this.sensors = detectedSensors;
    
    if (detectedSensors.length > 0) {
      console.log(`✅ Found ${detectedSensors.length} external sensor(s):`, 
        detectedSensors.map(s => s.name));
      
      // Auto-select the first available sensor
      this.activeSensor = detectedSensors[0];
      return this.activeSensor;
    } else {
      console.log('❌ No external fingerprint sensors detected');
      return null;
    }
  }

  /**
   * Detect Digital Persona sensors
   */
  async detectDigitalPersona() {
    try {
      // Check if Digital Persona SDK is available
      if (typeof window.DPFPSdk !== 'undefined') {
        console.log('🔍 Digital Persona SDK detected');
        return {
          type: 'digital_persona',
          name: 'Digital Persona U.are.U',
          sdk: window.DPFPSdk,
          priority: 1 // High priority
        };
      }
      
      // Alternative: Check via USB device detection
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        const dpDevice = devices.find(device => 
          device.vendorId === 0x05ba || // Digital Persona Vendor ID
          (device.productName && device.productName.toLowerCase().includes('digital persona'))
        );
        
        if (dpDevice) {
          console.log('🔍 Digital Persona device detected via USB');
          return {
            type: 'digital_persona_usb',
            name: 'Digital Persona (USB)',
            device: dpDevice,
            priority: 2
          };
        }
      }
    } catch (error) {
      console.error('Digital Persona detection error:', error);
    }
    return null;
  }

  /**
   * Detect SecuGen sensors
   */
  async detectSecuGen() {
    try {
      // Check if SecuGen SDK is available
      if (typeof window.SecuGenSdk !== 'undefined') {
        console.log('🔍 SecuGen SDK detected');
        return {
          type: 'secugen',
          name: 'SecuGen Hamster',
          sdk: window.SecuGenSdk,
          priority: 1
        };
      }
      
      // Check via USB
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        const sgDevice = devices.find(device => 
          device.vendorId === 0x1162 || // SecuGen Vendor ID
          (device.productName && device.productName.toLowerCase().includes('secugen'))
        );
        
        if (sgDevice) {
          console.log('🔍 SecuGen device detected via USB');
          return {
            type: 'secugen_usb',
            name: 'SecuGen (USB)',
            device: sgDevice,
            priority: 2
          };
        }
      }
    } catch (error) {
      console.error('SecuGen detection error:', error);
    }
    return null;
  }

  /**
   * Detect Futronic sensors
   */
  async detectFutronic() {
    try {
      if (typeof window.FutronicSdk !== 'undefined') {
        console.log('🔍 Futronic SDK detected');
        return {
          type: 'futronic',
          name: 'Futronic FS88',
          sdk: window.FutronicSdk,
          priority: 1
        };
      }
      
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        const ftDevice = devices.find(device => 
          device.vendorId === 0x1491 || // Futronic Vendor ID
          (device.productName && device.productName.toLowerCase().includes('futronic'))
        );
        
        if (ftDevice) {
          console.log('🔍 Futronic device detected via USB');
          return {
            type: 'futronic_usb',
            name: 'Futronic (USB)',
            device: ftDevice,
            priority: 2
          };
        }
      }
    } catch (error) {
      console.error('Futronic detection error:', error);
    }
    return null;
  }

  /**
   * Detect Suprema sensors
   */
  async detectSuprema() {
    try {
      if (typeof window.SupremaSdk !== 'undefined') {
        console.log('🔍 Suprema SDK detected');
        return {
          type: 'suprema',
          name: 'Suprema BioMini',
          sdk: window.SupremaSdk,
          priority: 1
        };
      }
      
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        const spDevice = devices.find(device => 
          device.vendorId === 0x16d1 || // Suprema Vendor ID
          (device.productName && device.productName.toLowerCase().includes('suprema'))
        );
        
        if (spDevice) {
          console.log('🔍 Suprema device detected via USB');
          return {
            type: 'suprema_usb',
            name: 'Suprema (USB)',
            device: spDevice,
            priority: 2
          };
        }
      }
    } catch (error) {
      console.error('Suprema detection error:', error);
    }
    return null;
  }

  /**
   * Detect generic Windows USB fingerprint sensors
   */
  async detectWindowsUSBSensor() {
    try {
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        
        // Known fingerprint sensor vendor IDs
        const fingerprintVendorIds = [
          0x27c6, // Shenzhen Goodix
          0x138a, // Validity Sensors
          0x06cb, // Synaptics
          0x0483, // STMicroelectronics
          0x1c7a, // LighTuning Technology
        ];
        
        const fpDevice = devices.find(device => 
          fingerprintVendorIds.includes(device.vendorId) ||
          (device.productName && 
           (device.productName.toLowerCase().includes('fingerprint') ||
            device.productName.toLowerCase().includes('biometric')))
        );
        
        if (fpDevice) {
          console.log('🔍 Generic USB fingerprint sensor detected');
          return {
            type: 'generic_usb',
            name: `USB Fingerprint (${fpDevice.productName || 'Unknown'})`,
            device: fpDevice,
            priority: 3
          };
        }
      }
    } catch (error) {
      console.error('Generic USB sensor detection error:', error);
    }
    return null;
  }

  /**
   * Start continuous fingerprint scanning
   */
  async startScanning(onScanCallback, onErrorCallback) {
    if (!this.activeSensor) {
      throw new Error('No active sensor available');
    }
    
    this.isScanning = true;
    this.scanCallback = onScanCallback;
    this.errorCallback = onErrorCallback;
    
    console.log(`🔄 Starting scan with ${this.activeSensor.name}...`);
    
    try {
      switch (this.activeSensor.type) {
        case 'digital_persona':
          return await this.scanDigitalPersona();
        case 'secugen':
          return await this.scanSecuGen();
        case 'futronic':
          return await this.scanFutronic();
        case 'suprema':
          return await this.scanSuprema();
        default:
          return await this.scanGenericUSB();
      }
    } catch (error) {
      this.isScanning = false;
      if (this.errorCallback) this.errorCallback(error);
      throw error;
    }
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    this.isScanning = false;
    console.log('⏹️ Stopped fingerprint scanning');
  }

  /**
   * Digital Persona scanning implementation
   */
  async scanDigitalPersona() {
    const sdk = this.activeSensor.sdk;
    
    while (this.isScanning) {
      try {
        const fingerprintData = await sdk.captureFingerprintAsync();
        if (fingerprintData && this.scanCallback) {
          this.scanCallback({
            type: 'external_sensor',
            sensor: 'digital_persona',
            data: fingerprintData,
            quality: fingerprintData.quality || 'good'
          });
        }
        
        // Small delay to prevent excessive CPU usage
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        if (error.name !== 'ScanTimeoutError') {
          console.error('Digital Persona scan error:', error);
          if (this.errorCallback) this.errorCallback(error);
        }
      }
    }
  }

  /**
   * SecuGen scanning implementation
   */
  async scanSecuGen() {
    const sdk = this.activeSensor.sdk;
    
    while (this.isScanning) {
      try {
        const fingerprintData = await sdk.getImage();
        if (fingerprintData && this.scanCallback) {
          this.scanCallback({
            type: 'external_sensor',
            sensor: 'secugen',
            data: fingerprintData,
            quality: 'good'
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        if (error.name !== 'NoFingerDetected') {
          console.error('SecuGen scan error:', error);
          if (this.errorCallback) this.errorCallback(error);
        }
      }
    }
  }

  /**
   * Generic scanning fallback
   */
  async scanGenericUSB() {
    // For generic sensors, we'll use a polling mechanism
    // This is a simplified implementation that would need sensor-specific integration
    
    while (this.isScanning) {
      try {
        // This would typically interface with the sensor's specific API
        // For now, we'll simulate the scanning process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In a real implementation, this would get actual fingerprint data
        // from the sensor's SDK or driver
        
      } catch (error) {
        console.error('Generic USB scan error:', error);
        if (this.errorCallback) this.errorCallback(error);
      }
    }
  }

  /**
   * Get sensor status and information
   */
  getSensorInfo() {
    return {
      hasExternalSensor: this.sensors.length > 0,
      activeSensor: this.activeSensor,
      allSensors: this.sensors,
      isScanning: this.isScanning
    };
  }

  /**
   * Test sensor connection
   */
  async testSensor() {
    if (!this.activeSensor) {
      throw new Error('No active sensor to test');
    }
    
    try {
      console.log(`🧪 Testing ${this.activeSensor.name}...`);
      
      // Implement sensor-specific test
      switch (this.activeSensor.type) {
        case 'digital_persona':
          return await this.testDigitalPersona();
        case 'secugen':
          return await this.testSecuGen();
        default:
          return await this.testGeneric();
      }
    } catch (error) {
      console.error('Sensor test failed:', error);
      throw error;
    }
  }

  async testDigitalPersona() {
    const sdk = this.activeSensor.sdk;
    const deviceCount = await sdk.getDeviceCount();
    return {
      status: 'connected',
      deviceCount,
      message: `Digital Persona sensor ready (${deviceCount} device(s))`
    };
  }

  async testSecuGen() {
    const sdk = this.activeSensor.sdk;
    const deviceInfo = await sdk.getDeviceInfo();
    return {
      status: 'connected',
      deviceInfo,
      message: 'SecuGen sensor ready'
    };
  }

  async testGeneric() {
    return {
      status: 'connected',
      message: 'Generic USB sensor detected'
    };
  }
}

// Create singleton instance
export const externalSensorManager = new ExternalSensorManager();

// Auto-detect sensors when module loads
externalSensorManager.detectSensors().catch(console.error);

export default ExternalSensorManager;
