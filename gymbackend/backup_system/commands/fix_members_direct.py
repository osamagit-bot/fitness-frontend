from django.core.management.base import BaseCommand
from apps.Authentication.models import CustomUser
from apps.Member.models import Member
from datetime import date, timedelta
from django.db import transaction

class Command(BaseCommand):
    help = 'Fix missing member records directly without signals'

    def handle(self, *args, **options):
        self.stdout.write('Creating missing member records...')
        
        # Disable signals temporarily
        from django.db.models.signals import post_save
        from apps.Notifications import signals as notification_signals
        
        post_save.disconnect(notification_signals.member_created_notification, sender=Member)
        
        try:
            # Get users that need member records
            users_needing_members = [
                {'user_id': 13, 'username': 'akash2', 'athlete_id': '2'},
                {'user_id': 12, 'username': 'osama1', 'athlete_id': '1'},
            ]
            
            created_count = 0
            
            for user_info in users_needing_members:
                try:
                    user = CustomUser.objects.get(id=user_info['user_id'])
                    
                    # Check if member already exists
                    if Member.objects.filter(user=user).exists():
                        self.stdout.write(f'Member already exists for {user.username}')
                        continue
                    
                    with transaction.atomic():
                        member = Member.objects.create(
                            user=user,
                            athlete_id=user_info['athlete_id'],
                            first_name=user.first_name or user.username.capitalize(),
                            last_name=user.last_name or 'Member',
                            monthly_fee=5000.00,
                            membership_type='fitness',
                            start_date=date.today() - timedelta(days=30),
                            expiry_date=date.today() + timedelta(days=30),
                            time_slot='morning',
                            is_active=True
                        )
                        created_count += 1
                        self.stdout.write(f'Created member: {member.athlete_id} for {user.username}')
                        
                except Exception as e:
                    self.stdout.write(f'Error creating member for user {user_info["username"]}: {str(e)}')
            
            self.stdout.write(f'Successfully created {created_count} member records')
            self.stdout.write(f'Total members now: {Member.objects.count()}')
            
        finally:
            # Reconnect signals
            post_save.connect(notification_signals.member_created_notification, sender=Member)