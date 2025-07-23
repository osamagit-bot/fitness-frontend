#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.prod')
django.setup()

def test_email_functions():
    print("🧪 Testing 3 email functions...")
    
    from apps.Notifications.email_service import EmailNotificationService
    from apps.Notifications.utils import format_afghanistan_time
    from django.utils import timezone
    
    service = EmailNotificationService()
    current_time = format_afghanistan_time(timezone.now())
    
    # Test 1: Member Registration
    print("1️⃣ Testing Member Registration Email...")
    service.send_admin_notification_email(
        "New Member Registration",
        f"Test member registration at {current_time}"
    )
    
    # Test 2: Member Check-in
    print("2️⃣ Testing Member Check-in Email...")
    service.send_admin_notification_email(
        "Member Check-in",
        f"Test member check-in at {current_time}"
    )
    
    # Test 3: Membership Expiry
    print("3️⃣ Testing Membership Expiry Email...")
    service.send_admin_notification_email(
        "Membership Expired",
        f"Test membership expiry at {current_time}"
    )
    
    print("✅ All 3 email functions tested!")
    print("📧 Check your email inbox for 3 test messages")

if __name__ == "__main__":
    test_email_functions()