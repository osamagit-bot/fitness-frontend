#!/usr/bin/env python
"""
Test using the existing EmailNotificationService
Run with: python test_email_service.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.prod')
django.setup()

def test_email_service():
    print("🧪 Testing EmailNotificationService...")
    
    try:
        from apps.Notifications.email_service import EmailNotificationService
        
        service = EmailNotificationService()
        success = service.send_admin_notification_email(
            "✅ Email System Test - Working!",
            "Congratulations! Your email system is now working correctly.\n\n"
            "This email was sent using your EmailNotificationService with SSL bypass.\n\n"
            "Next steps:\n"
            "1. Restart your Django server\n"
            "2. Create a new member\n"
            "3. You should receive real email notifications!"
        )
        
        if success:
            print("✅ EmailNotificationService test successful!")
            print("📧 Check your email inbox for the test message")
        else:
            print("❌ EmailNotificationService test failed")
            
        return success
        
    except Exception as e:
        print(f"❌ EmailNotificationService test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_email_service()