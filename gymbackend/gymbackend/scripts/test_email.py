#!/usr/bin/env python
"""
Quick email test script
Run with: python test_email.py
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.dev')
django.setup()

def test_email():
    print("🧪 Testing email configuration...")
    print(f"📧 EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"📧 EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"📧 EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"📧 EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    
    try:
        from django.core.mail import send_mail
        
        result = send_mail(
            subject='Test Email from Gym System',
            message='This is a test email to verify the configuration.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=['khanhemasa@gmail.com'],
            fail_silently=False,
        )
        
        print(f"✅ Email sent successfully! Result: {result}")
        return True
        
    except Exception as e:
        print(f"❌ Email test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_email()