"""
Configuration for external fingerprint sensors
This module handles different types of external fingerprint sensors
"""

class ExternalSensorConfig:
    """Configuration for external fingerprint sensors"""
    
    # Supported sensor types
    SENSOR_TYPES = {
        'WINDOWS_HELLO': {
            'name': 'Windows Hello',
            'webauthn_compatible': True,
            'requires_driver': False,
            'platform_authenticator': True
        },
        'USB_FINGERPRINT': {
            'name': 'USB Fingerprint Scanner',
            'webauthn_compatible': False,
            'requires_driver': True,
            'platform_authenticator': False,
            'common_models': ['Digital Persona', 'Futronic', 'SecuGen', 'Suprema']
        },
        'INTEGRATED_SENSOR': {
            'name': 'Laptop Integrated Sensor',
            'webauthn_compatible': True,
            'requires_driver': False,
            'platform_authenticator': True
        }
    }
    
    @staticmethod
    def get_sensor_recommendations():
        """Get recommendations for external sensor setup"""
        return {
            'for_kiosk_mode': {
                'recommended_sensors': [
                    'Digital Persona U.are.U 4500',
                    'SecuGen Hamster Pro 20',
                    'Futronic FS88H',
                    'Suprema BioMini Plus 2'
                ],
                'requirements': [
                    'USB 2.0 or higher connection',
                    'Windows 10/11 with latest updates',
                    'Proper driver installation',
                    'WebAuthn API support in browser'
                ],
                'setup_notes': [
                    'Install manufacturer drivers first',
                    'Test with Windows Hello setup',
                    'Verify WebAuthn compatibility',
                    'Configure sensor sensitivity settings'
                ]
            },
            'compatibility_check': {
                'webauthn_support': 'navigator.credentials && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()',
                'platform_authenticator': 'Check if sensor appears as platform authenticator',
                'browser_support': 'Chrome 67+, Firefox 60+, Edge 18+, Safari 14+'
            }
        }
    
    @staticmethod
    def validate_sensor_compatibility(user_agent, sensor_info=None):
        """Validate if the current setup supports external sensors"""
        compatibility = {
            'webauthn_supported': True,  # Assume supported, will be checked client-side
            'platform_authenticator': True,
            'external_sensor_ready': False,
            'recommendations': []
        }
        
        # Add specific recommendations based on user agent
        if 'Windows' in user_agent:
            compatibility['recommendations'].extend([
                'Ensure Windows Hello is set up',
                'Install latest Windows updates',
                'Configure fingerprint in Windows Settings'
            ])
        elif 'Mac' in user_agent:
            compatibility['recommendations'].extend([
                'Use Touch ID if available',
                'External USB sensors may require additional setup'
            ])
        else:
            compatibility['recommendations'].append(
                'External fingerprint sensors may have limited support on this platform'
            )
        
        return compatibility

# Sensor-specific integration helpers
class SensorIntegration:
    """Helper methods for different sensor integrations"""
    
    @staticmethod
    def get_webauthn_options_for_external_sensor():
        """Get WebAuthn options optimized for external sensors"""
        return {
            'authenticatorSelection': {
                'authenticatorAttachment': 'cross-platform',  # Allow external authenticators
                'userVerification': 'required',
                'requireResidentKey': False
            },
            'timeout': 60000,  # Longer timeout for external sensors
            'attestation': 'direct'
        }
    
    @staticmethod
    def get_authentication_options_for_kiosk():
        """Get authentication options for kiosk mode with external sensors"""
        return {
            'userVerification': 'required',
            'timeout': 30000,  # Reasonable timeout for kiosk
            'allowCredentials': [],  # Allow any registered credential
            'extensions': {
                'uvm': True  # Request user verification methods
            }
        }
    
    @staticmethod
    def handle_sensor_error(error_name, error_message):
        """Handle common sensor errors with user-friendly messages"""
        error_mappings = {
            'NotAllowedError': 'Fingerprint authentication was cancelled or denied',
            'NotSupportedError': 'Fingerprint authentication is not supported on this device',
            'SecurityError': 'Security error - please ensure the sensor is properly connected',
            'InvalidStateError': 'Sensor is busy - please wait and try again',
            'UnknownError': 'Unknown sensor error - please check sensor connection'
        }
        
        user_message = error_mappings.get(error_name, f'Sensor error: {error_message}')
        
        return {
            'error': user_message,
            'technical_error': f'{error_name}: {error_message}',
            'suggestions': [
                'Check sensor connection',
                'Restart the application',
                'Verify sensor drivers are installed',
                'Try registering fingerprint again'
            ]
        }