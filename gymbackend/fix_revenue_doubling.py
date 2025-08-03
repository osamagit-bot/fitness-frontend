#!/usr/bin/env python
"""
Script to fix revenue doubling issue by checking and correcting MembershipRevenue records
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.settings')
django.setup()

from apps.Member.models import Member, MembershipRevenue, MembershipPayment
from datetime import datetime
from decimal import Decimal

def check_revenue_status():
    """Check current revenue status and identify issues"""
    print("🔍 Checking current revenue status...")
    
    # Get current month
    current_month = datetime.now().replace(day=1).date()
    
    # Check MembershipRevenue table
    try:
        revenue_record = MembershipRevenue.objects.get(month=current_month)
        print(f"📊 Current MembershipRevenue record:")
        print(f"   Month: {revenue_record.month}")
        print(f"   Total Revenue: {revenue_record.total_revenue} AFN")
        print(f"   Member Count: {revenue_record.member_count}")
        print(f"   Last Updated: {revenue_record.last_updated}")
    except MembershipRevenue.DoesNotExist:
        print("❌ No MembershipRevenue record found for current month")
        revenue_record = None
    
    # Check actual members
    members = Member.objects.all()
    actual_member_count = members.count()
    actual_total_fees = sum(float(member.monthly_fee) for member in members)
    
    print(f"\n📊 Actual member data:")
    print(f"   Total Members: {actual_member_count}")
    print(f"   Sum of Monthly Fees: {actual_total_fees} AFN")
    
    # Check MembershipPayment records for current month
    current_month_payments = MembershipPayment.objects.filter(
        paid_on__month=current_month.month,
        paid_on__year=current_month.year
    )
    payment_total = sum(float(payment.amount) for payment in current_month_payments)
    
    print(f"\n📊 MembershipPayment records for current month:")
    print(f"   Payment Records: {current_month_payments.count()}")
    print(f"   Total Payments: {payment_total} AFN")
    
    # Identify the issue
    if revenue_record:
        persistent_revenue = float(revenue_record.total_revenue)
        print(f"\n🔍 Analysis:")
        print(f"   Persistent Revenue: {persistent_revenue} AFN")
        print(f"   Payment Records Total: {payment_total} AFN")
        print(f"   Actual Member Fees: {actual_total_fees} AFN")
        
        if persistent_revenue == payment_total and persistent_revenue != actual_total_fees:
            print("❌ ISSUE: Persistent revenue matches payment records but not actual member fees")
            print("   This suggests double counting is occurring")
            return True, revenue_record, actual_total_fees
        elif persistent_revenue == actual_total_fees:
            print("✅ Revenue appears correct")
            return False, revenue_record, actual_total_fees
        else:
            print("⚠️ Revenue mismatch detected")
            return True, revenue_record, actual_total_fees
    
    return False, None, actual_total_fees

def fix_revenue_doubling():
    """Fix revenue doubling by resetting to correct values"""
    print("\n🔧 Fixing revenue doubling...")
    
    has_issue, revenue_record, correct_total = check_revenue_status()
    
    if not has_issue:
        print("✅ No revenue doubling detected")
        return
    
    # Get current month
    current_month = datetime.now().replace(day=1).date()
    
    # Get actual member count
    actual_member_count = Member.objects.count()
    
    # Reset the revenue record to correct values
    if revenue_record:
        old_revenue = revenue_record.total_revenue
        revenue_record.total_revenue = Decimal(str(correct_total))
        revenue_record.member_count = actual_member_count
        revenue_record.save()
        
        print(f"✅ Fixed revenue record:")
        print(f"   Old Revenue: {old_revenue} AFN")
        print(f"   New Revenue: {revenue_record.total_revenue} AFN")
        print(f"   Member Count: {revenue_record.member_count}")
    else:
        # Create new record with correct values
        revenue_record = MembershipRevenue.objects.create(
            month=current_month,
            total_revenue=Decimal(str(correct_total)),
            member_count=actual_member_count
        )
        print(f"✅ Created new revenue record:")
        print(f"   Revenue: {revenue_record.total_revenue} AFN")
        print(f"   Member Count: {revenue_record.member_count}")

def show_member_details():
    """Show details of all members for debugging"""
    print("\n👥 Current members:")
    members = Member.objects.all().order_by('athlete_id')
    
    for member in members:
        print(f"   ID: {member.athlete_id}, Name: {member.first_name} {member.last_name}, Fee: {member.monthly_fee} AFN")
    
    total_fees = sum(float(member.monthly_fee) for member in members)
    print(f"\n💰 Total monthly fees: {total_fees} AFN")

if __name__ == "__main__":
    print("🏋️ GymFitness Revenue Doubling Fix")
    print("=" * 50)
    
    # Show current member details
    show_member_details()
    
    # Check and fix revenue
    fix_revenue_doubling()
    
    print("\n" + "=" * 50)
    print("✅ Revenue fix completed!")
    print("\nNext steps:")
    print("1. Test member registration to ensure revenue increases by correct amount")
    print("2. Test member deletion to ensure revenue doesn't decrease")
    print("3. Check dashboard and revenue pages for correct values")