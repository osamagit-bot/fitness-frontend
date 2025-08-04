#!/usr/bin/env python
"""
Fix biometric hash for existing member to match WebAuthn credential ID
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.dev')
django.setup()

from apps.Member.models import Member

def fix_member_biometric_hash():
    """Update member's biometric hash to match WebAuthn credential"""
    
    # The credential ID from the kiosk check-in attempt
    webauthn_credential_id = 'sLkLi7C74rnvMZyUOXB1ZajtR51hP9fCvScVKVJ4bsg'
    
    try:
        # Find the member with athlete_id '1' (Osama)
        member = Member.objects.get(athlete_id='1')
        
        print(f"Found member: {member.first_name} {member.last_name}")
        print(f"Current biometric hash: {member.biometric_hash}")
        print(f"WebAuthn credential ID: {webauthn_credential_id}")
        
        # Update the biometric hash to match the WebAuthn credential
        member.biometric_hash = webauthn_credential_id
        member.save()
        
        print(f"✅ Updated biometric hash for {member.first_name} {member.last_name}")
        print(f"New biometric hash: {member.biometric_hash}")
        
        return True
        
    except Member.DoesNotExist:
        print("❌ Member with athlete_id '1' not found")
        return False
    except Exception as e:
        print(f"❌ Error updating member: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Fixing biometric hash for WebAuthn compatibility...")
    success = fix_member_biometric_hash()
    
    if success:
        print("\n✅ Biometric hash updated successfully!")
        print("The member can now check in using the kiosk system.")
    else:
        print("\n❌ Failed to update biometric hash.")