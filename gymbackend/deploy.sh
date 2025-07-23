#!/bin/bash

# Production Deployment Script for Gym Backend
set -e

echo "🚀 Starting Gym Backend Production Deployment..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
else
    echo "❌ .env.production file not found!"
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p staticfiles
mkdir -p media

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --settings=gymbackend.setting.prod

# Add migration check
echo "🔍 Checking for pending migrations..."
python manage.py showmigrations --plan | grep '\[ \]' && {
    echo "❌ Pending migrations found!"
    exit 1
} || echo "✅ All migrations applied"

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --settings=gymbackend.setting.prod

# Create superuser if needed
echo "👤 Creating superuser (if needed)..."
python manage.py shell --settings=gymbackend.setting.prod << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@yourdomain.com', 'your-admin-password')
    print('Superuser created')
else:
    print('Superuser already exists')
EOF

# Run security check
echo "🔒 Running security checks..."
python manage.py check --deploy --settings=gymbackend.setting.prod

echo "✅ Deployment completed successfully!"
echo "🌐 Start the server with: daphne -b 0.0.0.0 -p 8000 gymbackend.asgi:application"
