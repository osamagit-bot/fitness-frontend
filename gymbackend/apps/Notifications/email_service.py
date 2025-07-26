"""
Email Notification Service for Gym Management System

This module provides email notification functionality for the gym management system.
It handles sending notifications to admin users for various system events.

Author: Gym Management System
Version: 1.0
Last Updated: 2025-01-21

Dependencies:
    - Django Core Mail
    - SSL (for secure connections)
    - SMTP (for email sending)

Configuration:
    Requires proper email settings in Django settings.py:
    - EMAIL_BACKEND
    - EMAIL_HOST
    - EMAIL_PORT
    - EMAIL_USE_TLS
    - EMAIL_HOST_USER
    - EMAIL_HOST_PASSWORD
    - DEFAULT_FROM_EMAIL

Usage:
    from apps.Notifications.email_service import EmailNotificationService
    
    service = EmailNotificationService()
    success = service.send_admin_notification_email(
        "Subject", 
        "Message content"
    )
"""

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging
from django.utils import timezone
import ssl
import smtplib

logger = logging.getLogger(__name__)

class EmailNotificationService:
    """
    Service class for handling email notifications in the gym management system.
    
    This service provides methods to send email notifications to admin users
    for various system events like member registration, payments, etc.
    
    Features:
        - HTML email templates with gym branding
        - Automatic admin user detection
        - SSL/TLS support with custom SSL context for development
        - Error handling and logging
        - Fallback mechanisms for missing configuration
    """
    
    @staticmethod
    def send_admin_notification_email(subject, message, admin_emails=None, check_preferences=True):
        """
        Send email notification to admin users with preference checking.
        """
        print("EMAIL SERVICE: Starting email send process...")

        # Check global notification toggle from database (not Django settings)
        try:
            from apps.Management.models import SiteSettings
            site_settings = SiteSettings.get_settings()
            if not site_settings.email_notifications_enabled:
                print("Global email notifications are DISABLED in database. No email will be sent.")
                logger.info("Email notification skipped: Global email notifications disabled")
                return False
        except Exception as e:
            print(f"Could not check global email settings: {e}")
            # Fallback to Django settings if database check fails
            if not getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', True):
                print("Global email notifications are DISABLED. No email will be sent.")
                logger.info("Email notification skipped: EMAIL_NOTIFICATIONS_ENABLED is False")
                return False
        
        # Auto-fetch admin emails if not provided
        if not admin_emails:
            from apps.Authentication.models import CustomUser
            if check_preferences:
                # Only get admins who have email notifications enabled
                admin_users = CustomUser.objects.filter(
                    is_staff=True, 
                    is_active=True,
                    email_notifications=True  # Check preference
                )
                admin_emails = list(admin_users.values_list('email', flat=True))
            else:
                admin_emails = list(
                    CustomUser.objects.filter(is_staff=True, is_active=True)
                    .values_list('email', flat=True)
                )
            
            # Fallback to sender email for testing if no admin emails found
            if not admin_emails:
                print("⚠️ No admin users with email notifications enabled found")
                return False
        
        print(f"📧 Sending email to {len(admin_emails)} admin(s) with email notifications enabled")
        
        # Validate that we have recipient emails
        if not admin_emails:
            print("No admin emails found!")
            logger.error("No admin emails found for notification")
            return False
        
        try:
            # Environment-aware SSL configuration
            if getattr(settings, 'DEBUG', False) and getattr(settings, 'EMAIL_DEV_SSL_BYPASS', False):
                # Development: Allow SSL bypass for local testing
                print("DEV MODE: Using SSL bypass for development")
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
            else:
                # Production: Use proper SSL verification
                print("PROD MODE: Using secure SSL verification")
                ssl_context = ssl.create_default_context()
            
            # Create SMTP connection manually for better control
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
            server.starttls(context=ssl_context)
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            
            print("✅ SMTP connection opened successfully")
            
            # Create and send email for each recipient
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            
            for email in admin_emails:
                # Create HTML content with gym branding for each email
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #333; margin-bottom: 20px;">🏋️ Gym Management System Notification</h2>
                        <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff;">
                            <p style="color: #555; line-height: 1.6; margin: 0;"><strong>Message:</strong> {message}</p>
                            <hr style="margin: 15px 0;">
                            <p style="color: #666; font-size: 14px;">
                                <strong>Sent from:</strong> {settings.EMAIL_HOST_USER}<br>
                                <strong>Sent to:</strong> {email}<br>
                                <strong>Time:</strong> {timezone.now()}
                            </p>
                        </div>
                        <p style="color: #666; font-size: 12px; margin-top: 20px;">
                            This is an automated notification from your Gym Management System.
                        </p>
                    </div>
                </div>
                """
                
                # Create multipart message (supports both HTML and plain text)
                msg = MIMEMultipart('alternative')
                msg['Subject'] = f"[Gym Management] {subject}"
                msg['From'] = settings.EMAIL_HOST_USER
                msg['To'] = email
                
                # Add both plain text and HTML versions
                plain_text = strip_tags(html_content)
                part1 = MIMEText(plain_text, 'plain')
                part2 = MIMEText(html_content, 'html')
                
                msg.attach(part1)
                msg.attach(part2)
                
                # Send the email
                server.send_message(msg)
                print(f"Email sent to: {email}")
            
            # Close SMTP connection
            server.quit()
            print(f"Email sent successfully to {len(admin_emails)} recipients")
            logger.info(f"Email notification sent successfully: {subject} to {len(admin_emails)} recipients")
            return True
        
        except Exception as e:
            print(f"Email send failed: {str(e)}")
            logger.error(f"Failed to send email notification: {subject} - Error: {str(e)}")
            
            # Ensure SMTP connection is closed even if error occurs
            try:
                server.quit()
            except:
                pass
            return False

    @staticmethod
    def validate_email_configuration():
        """
        Validate email configuration settings for both dev and production.
        
        Returns:
            dict: Configuration status with details about each setting
            
        Example:
            >>> config = EmailNotificationService.validate_email_configuration()
            >>> print(config['EMAIL_HOST_USER'])
        """
        is_debug = getattr(settings, 'DEBUG', False)
        ssl_bypass = getattr(settings, 'EMAIL_DEV_SSL_BYPASS', False)
        
        config = {
            'EMAIL_BACKEND': getattr(settings, 'EMAIL_BACKEND', 'Not configured'),
            'EMAIL_HOST': getattr(settings, 'EMAIL_HOST', 'Not configured'),
            'EMAIL_PORT': getattr(settings, 'EMAIL_PORT', 'Not configured'),
            'EMAIL_HOST_USER': getattr(settings, 'EMAIL_HOST_USER', 'Not configured'),
            'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', 'Not configured'),
            'EMAIL_USE_TLS': getattr(settings, 'EMAIL_USE_TLS', False),
            'EMAIL_USE_SSL': getattr(settings, 'EMAIL_USE_SSL', False),
            'ENVIRONMENT': 'Development' if is_debug else 'Production',
            'SSL_BYPASS_ENABLED': ssl_bypass and is_debug,
        }
        return config

    @staticmethod
    def get_admin_emails():
        """
        Get list of admin user email addresses.
        
        Returns:
            list: List of admin email addresses
            
        Example:
            >>> emails = EmailNotificationService.get_admin_emails()
            >>> print(f"Admin emails: {emails}")
        """
        try:
            from apps.Authentication.models import CustomUser
            return list(
                CustomUser.objects.filter(is_staff=True, is_active=True)
                .values_list('email', flat=True)
            )
        except Exception as e:
            logger.error(f"Failed to fetch admin emails: {str(e)}")
            return []




