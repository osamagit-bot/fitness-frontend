from django.core.management.base import BaseCommand
from users.models import Member

class Command(BaseCommand):
    help = 'Check for duplicate fingerprint registrations and report them'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Checking for duplicate fingerprint registrations...\n')
        
        # Get all members with biometric registration
        registered_members = Member.objects.filter(biometric_registered=True, biometric_hash__isnull=False)
        
        duplicates_found = []
        checked_hashes = set()
        
        for member in registered_members:
            if member.biometric_hash in checked_hashes:
                continue
                
            # Find all members with the same biometric hash
            same_hash_members = Member.objects.filter(
                biometric_hash=member.biometric_hash,
                biometric_registered=True
            )
            
            if same_hash_members.count() > 1:
                duplicate_group = []
                for dup_member in same_hash_members:
                    duplicate_group.append({
                        'athlete_id': dup_member.athlete_id,
                        'name': f"{dup_member.first_name} {dup_member.last_name}",
                        'hash': dup_member.biometric_hash
                    })
                duplicates_found.append(duplicate_group)
                
            checked_hashes.add(member.biometric_hash)
        
        if duplicates_found:
            self.stdout.write(self.style.ERROR(f'❌ Found {len(duplicates_found)} duplicate fingerprint groups:\n'))
            
            for i, group in enumerate(duplicates_found, 1):
                self.stdout.write(f'Group {i}:')
                for member in group:
                    self.stdout.write(f'  - {member["name"]} (ID: {member["athlete_id"]})')
                self.stdout.write('')
                
            self.stdout.write(self.style.WARNING('🛠️  To fix these duplicates, you can:'))
            self.stdout.write('1. Ask each member to re-register with a different finger')
            self.stdout.write('2. Keep only one registration per group and reset others\n')
            
            # Offer to reset duplicates (keep first, reset others)
            if input('Do you want to reset duplicate registrations (keep first member in each group)? [y/N]: ').lower() == 'y':
                for group in duplicates_found:
                    for member_data in group[1:]:  # Skip first member
                        member = Member.objects.get(athlete_id=member_data['athlete_id'])
                        member.biometric_registered = False
                        member.biometric_hash = None
                        member.save()
                        self.stdout.write(f'✅ Reset fingerprint for {member_data["name"]}')
                
                self.stdout.write(self.style.SUCCESS('\n🎉 Duplicate registrations have been reset!'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ No duplicate fingerprint registrations found!'))
            
        self.stdout.write(f'\n📊 Total registered members: {registered_members.count()}')
