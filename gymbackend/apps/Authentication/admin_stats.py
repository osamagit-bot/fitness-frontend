# admin_stats.py
from .models import CustomUser
from apps.Member.models import Member
from django.db.models import Sum
import traceback
from datetime import datetime, timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

def get_admin_stats():
    """
    Function to get admin dashboard statistics including monthly and annual revenue
    """
    try:
        # Debug info
        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active=True).count()
        total_members = Member.objects.count()
        
        print(f"DEBUG - Total users: {total_users}, Active users: {active_users}")
        print(f"DEBUG - Total members: {total_members}")
        
        # DIRECT COUNT APPROACH - Count all members
        # Since your Member model uses OneToOneField with primary_key=True,
        # each Member is automatically linked to an active user
        active_members = total_members
        print(f"DEBUG - Total members count: {active_members}")
        
        # Calculate monthly revenue - use persistent tracking to prevent resets
        from apps.Member.models import MembershipRevenue
        
        # Update current month revenue (only increases, never decreases)
        persistent_revenue = MembershipRevenue.update_current_month_revenue()
        
        # Also calculate current revenue for comparison
        monthly_revenue_query = Member.objects.aggregate(
            total=Sum('monthly_fee')
        )
        current_revenue = monthly_revenue_query['total'] or 0
        
        # Use the higher of persistent or current revenue
        monthly_revenue = max(float(persistent_revenue), float(current_revenue))
        
        print(f"DEBUG - Persistent revenue: {persistent_revenue}, Current revenue: {current_revenue}, Final: {monthly_revenue}")
        
        # Calculate annual revenue (monthly revenue * 12)
        annual_revenue = float(monthly_revenue) * 12
        print(f"DEBUG - Annual revenue: {annual_revenue}")
        
        # Calculate outstanding payments (this would need to be implemented based on your payment tracking)
        # For now, let's assume 10% of members have outstanding payments as an example
        # In a real implementation, you would query actual payment records
        outstanding_amount = round(float(monthly_revenue) * 0.1, 2)  # 10% of monthly revenue as a placeholder
        print(f"DEBUG - Outstanding payments: {outstanding_amount}")
        
        # For upcoming trainings, you would add your logic here
        upcoming_trainings = 0
        
        # Create current date for reference (could be used for period filtering)
        current_date = datetime.now()
        current_month = current_date.strftime('%B %Y')
        
        stats = {
            'activeMembers': active_members,
            'monthlyRevenue': float(monthly_revenue),
            'annualRevenue': annual_revenue,
            'outstandingPayments': outstanding_amount,
            'upcomingTrainings': upcoming_trainings,
            'currentPeriod': current_month,
            'debug': {
                'total_users': total_users,
                'active_users': active_users,
                'total_members': total_members
            }
        }
        
        print("DEBUG - Generated stats:", stats)
        return stats
    except Exception as e:
        print(f"ERROR - Failed to calculate stats: {str(e)}")
        traceback.print_exc()
        return {
            'activeMembers': 0,
            'monthlyRevenue': 0,
            'annualRevenue': 0,
            'outstandingPayments': 0,
            'upcomingTrainings': 0,
            'error': str(e)
        }

@api_view(['GET'])
@permission_classes([IsAdminUser])
def revenue_trend(request):
    """Get revenue trend for last 6 months"""
    try:
        from datetime import datetime, timedelta
        from django.db.models import Sum
        from apps.Member.models import MembershipPayment
        from apps.Purchase.models import Purchase
        
        # Get last 6 months
        end_date = datetime.now()
        revenue_data = []
        
        for i in range(6):
            # Calculate month start and end
            month_date = end_date - timedelta(days=30 * i)
            month_start = month_date.replace(day=1)
            if month_date.month == 12:
                month_end = month_date.replace(year=month_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = month_date.replace(month=month_date.month + 1, day=1) - timedelta(days=1)
            
            # Get membership revenue
            try:
                membership_revenue = MembershipPayment.objects.filter(
                    payment_date__range=[month_start, month_end]
                ).aggregate(total=Sum('amount'))['total'] or 0
            except:
                membership_revenue = 0
            
            # Get shop revenue
            try:
                shop_revenue = Purchase.objects.filter(
                    date__range=[month_start, month_end]
                ).aggregate(total=Sum('total_price'))['total'] or 0
            except:
                shop_revenue = 0
            
            revenue_data.append({
                'month': month_date.strftime('%b'),
                'revenue': float(membership_revenue + shop_revenue),
                'membership_revenue': float(membership_revenue),
                'shop_revenue': float(shop_revenue),
                'target': 45000
            })
        
        # Reverse to show oldest to newest
        revenue_data.reverse()
        
        return Response({
            'revenue_trend': revenue_data,
            'status': 'success'
        })
        
    except Exception as e:
        return Response({
            'error': str(e),
            'status': 'error'
        }, status=500)
