"""
WhatsApp Notification Service for Gym Management System

This module provides WhatsApp notification functionality that works alongside
the existing email notification system.

Author: Gym Management System
Version: 1.0
Last Updated: 2025-01-23

Dependencies:
    - Twilio (recommended): pip install twilio
    - OR MessageBird: pip install messagebird
    - OR WhatsApp Business API

Configuration:
    Requires proper WhatsApp API settings in Django settings.py:
    - WHATSAPP_SERVICE_PROVIDER
    - TWILIO_ACCOUNT_SID (if using Twilio)
    - TWILIO_AUTH_TOKEN (if using Twilio)
    - WHATSAPP_FROM_NUMBER
"""

from django.conf import settings
import logging
import requests
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

class WhatsAppNotificationService:
    """
    Service class for sending WhatsApp notifications in the gym management system.
    
    This service provides methods to send WhatsApp messages to admin users and members
    for various system events like member registration, payments, reminders, etc.
    
    Features:
        - Multiple WhatsApp service provider support (Twilio, MessageBird, etc.)
        - Environment-aware configuration (dev/prod)
        - Error handling and logging
        - Message templates for gym-specific notifications
        - Integration with existing notification system
    """
    
    def __init__(self):
        """Initialize WhatsApp service with configuration validation."""
        self.provider = getattr(settings, 'WHATSAPP_SERVICE_PROVIDER', 'twilio').lower()
        self.is_enabled = getattr(settings, 'WHATSAPP_NOTIFICATIONS_ENABLED', False)
        self.from_number = getattr(settings, 'WHATSAPP_FROM_NUMBER', '')
        
        if self.is_enabled and not self.from_number:
            logger.warning("WhatsApp notifications enabled but WHATSAPP_FROM_NUMBER not configured")
    
    def send_admin_whatsapp_notification(self, message: str, admin_phones: Optional[List[str]] = None) -> bool:
        """
        Send WhatsApp notification to admin users.
        """
        # Check global WhatsApp notification toggle from database
        try:
            from apps.Management.models import SiteSettings
            site_settings = SiteSettings.get_settings()
            if not site_settings.whatsapp_notifications_enabled:
                print("Global WhatsApp notifications are DISABLED in database. No WhatsApp will be sent.")
                logger.info("WhatsApp notification skipped: Global WhatsApp notifications disabled")
                return False
        except Exception as e:
            print(f"Could not check global WhatsApp settings: {e}")
            # Fallback to Django settings if database check fails
            if not self.is_enabled:
                logger.info("WhatsApp notifications are disabled")
                return False
            
        print("WHATSAPP SERVICE: Starting message send process...")
        print(f"PROVIDER: {self.provider}")
        print(f"FROM_NUMBER: {self.from_number}")
        
        # Auto-fetch admin phone numbers if not provided
        if not admin_phones:
            admin_phones = self._get_admin_phone_numbers()
            
        if not admin_phones:
            print("No admin phone numbers found!")
            logger.error("No admin phone numbers found for WhatsApp notification")
            return False
            
        print(f"SENDING TO PHONES: {admin_phones}")
        
        # Format message with gym branding
        formatted_message = self._format_gym_message(message)
        
        try:
            if self.provider == 'twilio':
                return self._send_via_twilio(formatted_message, admin_phones)
            elif self.provider == 'messagebird':
                return self._send_via_messagebird(formatted_message, admin_phones)
            elif self.provider == 'whatsapp_business':
                return self._send_via_whatsapp_business(formatted_message, admin_phones)
            else:
                logger.error(f"Unsupported WhatsApp provider: {self.provider}")
                return False
                
        except Exception as e:
            print(f"WhatsApp send failed: {str(e)}")
            logger.error(f"Failed to send WhatsApp notification: {message} - Error: {str(e)}")
            return False
    
    def _send_via_twilio(self, message: str, phone_numbers: List[str]) -> bool:
        """Send WhatsApp message via Twilio API."""
        try:
            from twilio.rest import Client
            
            account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
            auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
            
            if not account_sid or not auth_token:
                logger.error("Twilio credentials not configured")
                return False
                
            client = Client(account_sid, auth_token)
            
            success_count = 0
            for phone in phone_numbers:
                try:
                    # Format phone number for WhatsApp (must include country code)
                    formatted_phone = self._format_phone_number(phone)
                    
                    message_obj = client.messages.create(
                        from_=f'whatsapp:{self.from_number}',
                        body=message,
                        to=f'whatsapp:{formatted_phone}'
                    )
                    
                    print(f"WhatsApp sent to {formatted_phone}: {message_obj.sid}")
                    success_count += 1
                    
                except Exception as e:
                    print(f"Failed to send to {phone}: {str(e)}")
                    logger.error(f"Twilio WhatsApp send failed for {phone}: {str(e)}")
            
            return success_count > 0
            
        except ImportError:
            logger.error("Twilio library not installed. Run: pip install twilio")
            return False
        except Exception as e:
            logger.error(f"Twilio WhatsApp service error: {str(e)}")
            return False
    
    def _send_via_messagebird(self, message: str, phone_numbers: List[str]) -> bool:
        """Send WhatsApp message via MessageBird API."""
        try:
            import messagebird
            
            api_key = getattr(settings, 'MESSAGEBIRD_API_KEY', '')
            if not api_key:
                logger.error("MessageBird API key not configured")
                return False
                
            client = messagebird.Client(api_key)
            
            success_count = 0
            for phone in phone_numbers:
                try:
                    formatted_phone = self._format_phone_number(phone)
                    
                    result = client.conversation_send(
                        to=formatted_phone,
                        type='text',
                        content={'text': message},
                        channelId='your-whatsapp-channel-id'  # Configure this
                    )
                    
                    print(f"WhatsApp sent to {formatted_phone}: {result.id}")
                    success_count += 1
                    
                except Exception as e:
                    print(f"Failed to send to {phone}: {str(e)}")
                    logger.error(f"MessageBird WhatsApp send failed for {phone}: {str(e)}")
            
            return success_count > 0
            
        except ImportError:
            logger.error("MessageBird library not installed. Run: pip install messagebird")
            return False
        except Exception as e:
            logger.error(f"MessageBird WhatsApp service error: {str(e)}")
            return False
    
    def _send_via_whatsapp_business(self, message: str, phone_numbers: List[str]) -> bool:
        """Send WhatsApp message via official WhatsApp Business API."""
        try:
            access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
            phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
            
            if not access_token or not phone_number_id:
                logger.error("WhatsApp Business API credentials not configured")
                return False
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            success_count = 0
            for phone in phone_numbers:
                try:
                    formatted_phone = self._format_phone_number(phone)
                    
                    data = {
                        'messaging_product': 'whatsapp',
                        'to': formatted_phone,
                        'type': 'text',
                        'text': {'body': message}
                    }
                    
                    response = requests.post(
                        f'https://graph.facebook.com/v18.0/{phone_number_id}/messages',
                        headers=headers,
                        json=data
                    )
                    
                    if response.status_code == 200:
                        print(f"WhatsApp sent to {formatted_phone}")
                        success_count += 1
                    else:
                        print(f"Failed to send to {phone}: {response.text}")
                        
                except Exception as e:
                    print(f"Failed to send to {phone}: {str(e)}")
                    logger.error(f"WhatsApp Business API send failed for {phone}: {str(e)}")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"WhatsApp Business API service error: {str(e)}")
            return False
    
    def _get_admin_phone_numbers(self) -> List[str]:
        """Get list of admin user phone numbers from database."""
        try:
            from apps.Authentication.models import CustomUser
            
            phone_numbers = list(
                CustomUser.objects.filter(is_staff=True, is_active=True)
                .exclude(phone__isnull=True)
                .exclude(phone='')
                .values_list('phone', flat=True)
            )
            
            return phone_numbers
            
        except Exception as e:
            logger.error(f"Failed to fetch admin phone numbers: {str(e)}")
            return []
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for WhatsApp (ensure country code)."""
        # Remove any non-digit characters
        phone = ''.join(filter(str.isdigit, phone))
        
        # Add default country code if not present (adjust for your country)
        default_country_code = getattr(settings, 'DEFAULT_COUNTRY_CODE', '1')  # US default
        
        if not phone.startswith(default_country_code) and len(phone) < 12:
            phone = f"{default_country_code}{phone}"
            
        return phone
    
    def _format_gym_message(self, message: str) -> str:
        """Format message with gym branding."""
        gym_name = getattr(settings, 'GYM_NAME', 'Gym Management System')
        
        formatted_message = f"""
🏋️ {gym_name} Notification

{message}

---
This is an automated notification from your gym management system.
        """.strip()
        
        return formatted_message
    
    @staticmethod
    def validate_whatsapp_configuration() -> Dict[str, Any]:
        """
        Validate WhatsApp configuration settings.
        
        Returns:
            dict: Configuration status with details about each setting
        """
        provider = getattr(settings, 'WHATSAPP_SERVICE_PROVIDER', 'Not set')
        is_enabled = getattr(settings, 'WHATSAPP_NOTIFICATIONS_ENABLED', False)
        
        config = {
            'WHATSAPP_ENABLED': is_enabled,
            'WHATSAPP_SERVICE_PROVIDER': provider,
            'WHATSAPP_FROM_NUMBER': getattr(settings, 'WHATSAPP_FROM_NUMBER', 'Not set'),
            'GYM_NAME': getattr(settings, 'GYM_NAME', 'Not set'),
            'DEFAULT_COUNTRY_CODE': getattr(settings, 'DEFAULT_COUNTRY_CODE', 'Not set'),
        }
        
        # Provider-specific configuration
        if provider.lower() == 'twilio':
            config.update({
                'TWILIO_ACCOUNT_SID': 'Configured' if getattr(settings, 'TWILIO_ACCOUNT_SID', '') else 'Not set',
                'TWILIO_AUTH_TOKEN': 'Configured' if getattr(settings, 'TWILIO_AUTH_TOKEN', '') else 'Not set',
            })
        elif provider.lower() == 'messagebird':
            config.update({
                'MESSAGEBIRD_API_KEY': 'Configured' if getattr(settings, 'MESSAGEBIRD_API_KEY', '') else 'Not set',
            })
        elif provider.lower() == 'whatsapp_business':
            config.update({
                'WHATSAPP_ACCESS_TOKEN': 'Configured' if getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '') else 'Not set',
                'WHATSAPP_PHONE_NUMBER_ID': 'Configured' if getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '') else 'Not set',
            })
        
        return config
    
    def send_member_whatsapp_notification(self, message: str, member_phone: str) -> bool:
        """
        Send WhatsApp notification to a specific member.
        """
        # Check global WhatsApp notification toggle from database
        try:
            from apps.Management.models import SiteSettings
            site_settings = SiteSettings.get_settings()
            if not site_settings.whatsapp_notifications_enabled:
                return False
        except Exception as e:
            # Fallback to Django settings if database check fails
            if not self.is_enabled:
                return False
            
        try:
            formatted_message = self._format_gym_message(message)
            
            if self.provider == 'twilio':
                return self._send_via_twilio(formatted_message, [member_phone])
            elif self.provider == 'messagebird':
                return self._send_via_messagebird(formatted_message, [member_phone])
            elif self.provider == 'whatsapp_business':
                return self._send_via_whatsapp_business(formatted_message, [member_phone])
            else:
                return False
                
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to member {member_phone}: {str(e)}")
            return False


