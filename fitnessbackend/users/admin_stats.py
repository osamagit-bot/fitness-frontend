# admin_stats.py
from .models import Member, CustomUser
from django.db.models import Sum
import traceback
from datetime import datetime, timedelta

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
        
        # Calculate monthly revenue - use all members
        monthly_revenue_query = Member.objects.aggregate(
            total=Sum('monthly_fee')
        )
        monthly_revenue = monthly_revenue_query['total'] or 0
        print(f"DEBUG - Monthly revenue: {monthly_revenue} from query {monthly_revenue_query}")
        
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