INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    
    # Local apps
    'apps.Authentication',
    'apps.Member',
    'apps.Attendance',
    'apps.Purchase',
    'apps.Community',
    'apps.Notifications',
    'apps.Management',  # Add this line
]