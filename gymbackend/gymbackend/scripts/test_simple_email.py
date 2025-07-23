#!/usr/bin/env python
"""
Simple email test without database dependency
"""
import os
import django
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import pytz

def test_simple_emails():
    print("🧪 Testing 3 email functions (Direct SMTP)...")
    
    # Afghanistan timezone
    kabul_tz = pytz.timezone('Asia/Kabul')
    current_time = datetime.now(kabul_tz).strftime('%Y-%m-%d %I:%M:%S %p')
    
    # Email settings
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587
    email_user = 'khanhemasa@gmail.com'
    email_password = 'ywal wnpw tfkn xanq'
    
    # Create SSL context (same as your email service)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls(context=ssl_context)
        server.login(email_user, email_password)
        
        # Test emails
        test_emails = [
            {
                'subject': '[Gym Management] New Member Registration',
                'body': f'Test member registration at {current_time}\n\nThis is a test of the member registration email function.'
            },
            {
                'subject': '[Gym Management] Member Check-in',
                'body': f'Test member check-in at {current_time}\n\nThis is a test of the member check-in email function.'
            },
            {
                'subject': '[Gym Management] Membership Expired',
                'body': f'Test membership expiry at {current_time}\n\nThis is a test of the membership expiry email function.'
            }
        ]
        
        for i, email_data in enumerate(test_emails, 1):
            print(f"{i}️⃣ Sending: {email_data['subject']}")
            
            msg = MIMEMultipart()
            msg['From'] = email_user
            msg['To'] = email_user
            msg['Subject'] = email_data['subject']
            
            msg.attach(MIMEText(email_data['body'], 'plain'))
            
            server.sendmail(email_user, [email_user], msg.as_string())
            print(f"   ✅ Sent successfully!")
        
        server.quit()
        print("\n✅ All 3 email functions tested!")
        print("📧 Check your email inbox for 3 test messages")
        
    except Exception as e:
        print(f"❌ Email test failed: {str(e)}")

if __name__ == "__main__":
    test_simple_emails()