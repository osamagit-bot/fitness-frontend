from .base import *
import os

# Remove this line that's causing the error:
# from dotenv import load_dotenv
# load_dotenv()

# Use django-environ instead (already configured in base.py)
# The env variables are already loaded in base.py

# Development settings
DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'gymbackend',
        'USER': 'root',
        'PASSWORD': '1234',
        'HOST': 'localhost',
        'PORT': '3307',
    }
}

# Email Configuration - Development Settings
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=True)
EMAIL_USE_SSL = env('EMAIL_USE_SSL', default=False)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER)
EMAIL_TIMEOUT = 30

# Development-specific email settings
EMAIL_DEV_SSL_BYPASS = env('EMAIL_DEV_SSL_BYPASS', default=True)  # Allow SSL bypass in dev
EMAIL_DEV_MODE = True

# WhatsApp Configuration - Development
WHATSAPP_NOTIFICATIONS_ENABLED = env('WHATSAPP_NOTIFICATIONS_ENABLED', default=False)
WHATSAPP_SERVICE_PROVIDER = env('WHATSAPP_SERVICE_PROVIDER', default='twilio')  # twilio, messagebird, whatsapp_business
WHATSAPP_FROM_NUMBER = env('WHATSAPP_FROM_NUMBER', default='')
GYM_NAME = env('GYM_NAME', default='Fitness Gym Management System')
DEFAULT_COUNTRY_CODE = env('DEFAULT_COUNTRY_CODE', default='1')  # US default

# Twilio Configuration (if using Twilio)
TWILIO_ACCOUNT_SID = env('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = env('TWILIO_AUTH_TOKEN', default='')

# MessageBird Configuration (if using MessageBird)
MESSAGEBIRD_API_KEY = env('MESSAGEBIRD_API_KEY', default='')

# WhatsApp Business API Configuration (if using official API)
WHATSAPP_ACCESS_TOKEN = env('WHATSAPP_ACCESS_TOKEN', default='')
WHATSAPP_PHONE_NUMBER_ID = env('WHATSAPP_PHONE_NUMBER_ID', default='')

# print("EMAIL CONFIG DEBUG:")
# print(f"   EMAIL_HOST_USER: {EMAIL_HOST_USER}")
# print(f"   EMAIL_PORT: {EMAIL_PORT}")
# print(f"   EMAIL_USE_TLS: {EMAIL_USE_TLS}")
# print(f"   EMAIL_DEV_SSL_BYPASS: {EMAIL_DEV_SSL_BYPASS}")

# Print debug info
# print(f"DEV MODE - BASE_DIR: {BASE_DIR}")
# print(f"Templates path: {BASE_DIR / 'templates'}")
# print(f"Email backend: {EMAIL_BACKEND}")
# print("Real email sending ENABLED")
