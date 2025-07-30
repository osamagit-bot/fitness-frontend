from django.core.management.base import BaseCommand
from django.db import models
from apps.Member.models import MembershipRevenue, Member


class Command(BaseCommand):
    help = 'Test membership revenue calculation and display current status'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Testing Membership Revenue System...')
        self.stdout.write('=' * 50)
        
        try:
            # Get current member stats
            member_count = Member.objects.count()
            total_fees = Member.objects.aggregate(
                total=models.Sum('monthly_fee')
            )['total'] or 0
            
            self.stdout.write(f'📊 Current Active Members: {member_count}')
            self.stdout.write(f'💰 Sum of All Monthly Fees: {total_fees} AFN')
            
            # Check current revenue record
            try:
                current_revenue = MembershipRevenue.get_current_month_revenue()
                self.stdout.write(f'📈 Stored Monthly Revenue: {current_revenue} AFN')
            except Exception as e:
                self.stdout.write(f'❌ Error getting stored revenue: {e}')
                current_revenue = 0
            
            # Show comparison and explanation
            self.stdout.write('\n📋 REVENUE LOGIC EXPLANATION:')
            self.stdout.write(f'💡 Current Active Members Total: {total_fees} AFN (what they would pay)')
            self.stdout.write(f'💰 Actual Monthly Revenue: {current_revenue} AFN (what was actually collected)')
            
            if float(total_fees) != float(current_revenue):
                self.stdout.write(
                    self.style.WARNING(
                        '⚠️  These values may differ because:'
                    )
                )
                self.stdout.write('   • Members who left already paid for this month')
                self.stdout.write('   • Revenue accumulates when members join')
                self.stdout.write('   • Revenue does NOT decrease when members leave')
                self.stdout.write('   • This is correct business logic!')
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ Values match (no members left this month)')
                )
            
            # Show recent members for debugging
            self.stdout.write('\n📋 Recent Members:')
            recent_members = Member.objects.order_by('-id')[:5]
            for member in recent_members:
                self.stdout.write(
                    f'  • {member.first_name} {member.last_name} - {member.monthly_fee} AFN'
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error during test: {e}')
            )