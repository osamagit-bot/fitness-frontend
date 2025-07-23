from .base import *
import os

# CRITICAL: Override insecure base settings
DEBUG = False
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=[])  # Remove '*' wildcard

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTPS Settings (CRITICAL for production)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS Security
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# Database Connection Security
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='3306'),
        'OPTIONS': {
            'sql_mode': 'traditional',
            'charset': 'utf8mb4',
            'init_command': "SET innodb_strict_mode=1",
        },
        'CONN_MAX_AGE': 60,  # Connection pooling
    }
}

# Static Files with WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media Files Security
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

#Add file upload security
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

#Allowed file types for security
ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]
MAX_IMAGE_SIZE = 5 * 1024 * 1024 #5MB



# Email Configuration - Production Settings
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=True)
EMAIL_USE_SSL = env('EMAIL_USE_SSL', default=False)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER)
EMAIL_TIMEOUT = 30

# Production-specific email settings
EMAIL_DEV_SSL_BYPASS = False  # Never bypass SSL in production
EMAIL_DEV_MODE = False

# WhatsApp Configuration - Production
WHATSAPP_NOTIFICATIONS_ENABLED = env('WHATSAPP_NOTIFICATIONS_ENABLED', default=False)
WHATSAPP_SERVICE_PROVIDER = env('WHATSAPP_SERVICE_PROVIDER', default='twilio')
WHATSAPP_FROM_NUMBER = env('WHATSAPP_FROM_NUMBER', default='')
GYM_NAME = env('GYM_NAME', default='Fitness Gym Management System')
DEFAULT_COUNTRY_CODE = env('DEFAULT_COUNTRY_CODE', default='1')

# Twilio Configuration (if using Twilio)
TWILIO_ACCOUNT_SID = env('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = env('TWILIO_AUTH_TOKEN', default='')

# MessageBird Configuration (if using MessageBird)
MESSAGEBIRD_API_KEY = env('MESSAGEBIRD_API_KEY', default='')

# WhatsApp Business API Configuration (if using official API)
WHATSAPP_ACCESS_TOKEN = env('WHATSAPP_ACCESS_TOKEN', default='')
WHATSAPP_PHONE_NUMBER_ID = env('WHATSAPP_PHONE_NUMBER_ID', default='')

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'gymbackend',
        'TIMEOUT': 300,
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Performance Settings
USE_TZ = True
USE_I18N = False  # Disable if not using internationalization

# HisabPay Configuration
HISAB_PAY_API_KEY = os.environ.get('HISAB_PAY_API_KEY')
HISAB_PAY_MERCHANT_ID = os.environ.get('HISAB_PAY_MERCHANT_ID')
HISAB_PAY_API_URL = os.environ.get('HISAB_PAY_API_URL', 'https://api.hisabpay.com/v1')

# Validate required payment settings
if not HISAB_PAY_API_KEY or not HISAB_PAY_MERCHANT_ID:
    import warnings
    warnings.warn("HisabPay credentials not configured. Payment system will run in simulation mode.")
