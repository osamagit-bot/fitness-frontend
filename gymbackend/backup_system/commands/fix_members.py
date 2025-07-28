from django.core.management.base import BaseCommand
from apps.Authentication.models import CustomUser
from apps.Member.models import Member
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Fix missing member records for users with member role'

    def handle(self, *args, **options):
        self.stdout.write('Checking for users without member records...')
        
        # Get all users with member role
        member_users = CustomUser.objects.filter(role='member')
        self.stdout.write(f'Found {member_users.count()} users with member role')
        
        created_count = 0
        
        for user in member_users:
            self.stdout.write(f'Checking user: {user.username} (ID: {user.id})')
            
            # Check if member record exists
            if not hasattr(user, 'member') or not Member.objects.filter(user=user).exists():
                self.stdout.write(f'No member record found for user {user.username}')
                
                # Create member record
                athlete_id = user.username.replace('member', '') or str(user.id)
                first_name = user.first_name or user.username.capitalize()
                last_name = user.last_name or "Member"
                
                try:
                    member = Member(
                        user=user,
                        athlete_id=athlete_id,
                        first_name=first_name,
                        last_name=last_name,
                        monthly_fee=5000.00,
                        membership_type='fitness',
                        start_date=date.today() - timedelta(days=30),
                        expiry_date=date.today() + timedelta(days=30),
                        time_slot='morning',
                        is_active=True
                    )
                    member.save()
                    created_count += 1
                    self.stdout.write(f'Created member record: {member.athlete_id} for {user.username}')
                except Exception as e:
                    self.stdout.write(f'Error creating member for {user.username}: {str(e)}')
            else:
                member = Member.objects.get(user=user)
                self.stdout.write(f'Member record exists: {member.athlete_id}')
        
        self.stdout.write(f'Created {created_count} new member records')
        self.stdout.write(f'Final count: {Member.objects.count()} members')