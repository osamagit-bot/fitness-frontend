from django.db import models
from django.utils import timezone
from decimal import Decimal

class MembershipRevenue(models.Model):
    """Track cumulative membership revenue to prevent resets when members are deleted"""
    month = models.DateField()  # First day of the month
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    member_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['month']
    
    @classmethod
    def update_current_month_revenue(cls):
        """Update revenue for current month based on active members"""
        from .models import Member
        from datetime import datetime
        
        current_month = datetime.now().replace(day=1).date()
        
        # Calculate current revenue from active members
        current_revenue = Member.objects.aggregate(
            total=models.Sum('monthly_fee')
        )['total'] or Decimal('0')
        
        current_count = Member.objects.count()
        
        # Get or create revenue record for current month
        revenue_record, created = cls.objects.get_or_create(
            month=current_month,
            defaults={
                'total_revenue': current_revenue,
                'member_count': current_count
            }
        )
        
        # Only update if current revenue is higher (prevents resets)
        if current_revenue > revenue_record.total_revenue:
            revenue_record.total_revenue = current_revenue
            revenue_record.member_count = current_count
            revenue_record.save()
        
        return revenue_record.total_revenue
    
    @classmethod
    def get_current_month_revenue(cls):
        """Get persistent revenue for current month"""
        from datetime import datetime
        
        current_month = datetime.now().replace(day=1).date()
        
        try:
            revenue_record = cls.objects.get(month=current_month)
            return revenue_record.total_revenue
        except cls.DoesNotExist:
            return cls.update_current_month_revenue()