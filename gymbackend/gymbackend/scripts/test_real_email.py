#!/usr/bin/env python
"""
Test real email sending (bypasses console backend)
Run with: python test_real_email.py
"""

import os
import django
import ssl
from django.conf import settings

# Setup Django with production-like email settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.prod')
django.setup()

def test_real_email():
    print("🧪 Testing REAL email sending...")
    
    # Use the same SSL bypass method as email_service.py
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    try:
        # Create SSL context that doesn't verify certificates (same as email_service.py)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Create SMTP connection manually
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls(context=ssl_context)  # Use our custom SSL context
        server.login('khanhemasa@gmail.com', 'ywal wnpw tfkn xanq')
        
        print("✅ SMTP connection successful!")
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = 'khanhemasa@gmail.com'
        msg['To'] = 'khanhemasa@gmail.com'
        msg['Subject'] = 'Real Test Email from Gym System'
        
        body = 'This is a REAL test email sent via SMTP (not console) with SSL bypass.'
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        text = msg.as_string()
        server.sendmail('khanhemasa@gmail.com', ['khanhemasa@gmail.com'], text)
        server.quit()
        
        print("✅ Real email sent successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Real email test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_real_email()
