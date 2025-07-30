from django.core.management.base import BaseCommand
from django.db import models
from apps.Member.models import MembershipRevenue, Member


class Command(BaseCommand):
    help = 'Initialize membership revenue for current month (one-time setup)'

    def handle(self, *args, **options):
        self.stdout.write('🔄 Initializing membership revenue for current month...')
        
        try:
            # Get current member count and total fees
            member_count = Member.objects.count()
            total_fees = Member.objects.aggregate(
                total=models.Sum('monthly_fee')
            )['total'] or 0
            
            self.stdout.write(f'📊 Current members: {member_count}')
            self.stdout.write(f'💰 Total monthly fees: {total_fees} AFN')
            
            # Get current revenue (this will initialize if needed)
            current_revenue = MembershipRevenue.update_current_month_revenue()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Current month revenue: {current_revenue} AFN'
                )
            )
            
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Note: This command only initializes. New members automatically add revenue.'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error initializing revenue: {e}')
            )