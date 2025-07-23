from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a new admin user with proper validation'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Admin username')
        parser.add_argument('--email', type=str, help='Admin email')
        parser.add_argument('--password', type=str, help='Admin password')
        parser.add_argument('--firstname', type=str, help='First name')
        parser.add_argument('--lastname', type=str, help='Last name')
        parser.add_argument('--force', action='store_true', help='Force creation even if user exists')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Creating new admin user...'))
        
        # Get user input
        username = options['username'] or input('👤 Username: ')
        email = options['email'] or input('📧 Email: ')
        password = options['password'] or input('🔑 Password: ')
        firstname = options['firstname'] or input('👨 First name: ')
        lastname = options['lastname'] or input('👨 Last name: ')

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            self.stdout.write(self.style.ERROR(f'❌ Invalid email format: {email}'))
            return

        # Check if user exists
        if User.objects.filter(username=username).exists():
            if not options['force']:
                self.stdout.write(self.style.ERROR(f'❌ User with username "{username}" already exists'))
                self.stdout.write(self.style.WARNING('💡 Use --force to update existing user'))
                return
            else:
                # Update existing user
                user = User.objects.get(username=username)
                user.email = email
                user.first_name = firstname
                user.last_name = lastname
                user.set_password(password)
                user.role = 'admin'
                user.is_staff = True
                user.is_superuser = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Updated existing user "{username}" to admin'))
                return

        if User.objects.filter(email=email).exists():
            if not options['force']:
                self.stdout.write(self.style.ERROR(f'❌ User with email "{email}" already exists'))
                return

        # Create new admin user
        try:
            admin = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                first_name=firstname,
                last_name=lastname,
                role='admin'
            )

            self.stdout.write(self.style.SUCCESS('✅ Admin user created successfully!'))
            self.stdout.write(self.style.SUCCESS(f'👤 Username: {admin.username}'))
            self.stdout.write(self.style.SUCCESS(f'📧 Email: {admin.email}'))
            self.stdout.write(self.style.SUCCESS(f'👨 Name: {admin.first_name} {admin.last_name}'))
            self.stdout.write(self.style.SUCCESS(f'🏢 Role: {admin.role}'))
            self.stdout.write(self.style.SUCCESS(f'⚡ Staff: {admin.is_staff}'))
            self.stdout.write(self.style.SUCCESS(f'🔑 Superuser: {admin.is_superuser}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating admin: {str(e)}'))
