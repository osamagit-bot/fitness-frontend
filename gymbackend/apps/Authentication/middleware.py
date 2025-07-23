import os
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Middleware to handle maintenance mode for the gym fitness application.
    When maintenance mode is enabled, only admin users can access the system.
    """
    
    def process_request(self, request):
        # Check if maintenance mode is enabled
        maintenance_file = os.path.join(settings.BASE_DIR, '.maintenance_mode')
        
        if not os.path.exists(maintenance_file):
            # Maintenance mode is not enabled
            return None
        
        # Debug logging
        print(f"🔧 MAINTENANCE MODE: Path: {request.path}, User: {request.user}, Is Staff: {getattr(request.user, 'is_staff', False)}")
        
        # Allow access to ALL admin dashboard endpoints (including login)
        if request.path.startswith('/api/admin-dashboard/'):
            print(f"✅ ALLOWING ADMIN DASHBOARD: {request.path}")
            return None
        
        # Allow access to authentication test endpoints (needed for token validation)
        if request.path.startswith('/api/auth-test/'):
            return None
        
        # Allow access to token refresh endpoints
        if request.path.startswith('/api/token/'):
            return None
        
        # Block member login explicitly during maintenance mode
        if request.path.startswith('/api/members/login/'):
            print(f"🚫 BLOCKING MEMBER LOGIN: {request.path}")
            # Continue to maintenance mode response
        
        # Allow access to common admin API endpoints (but not login endpoints)
        elif request.path.startswith('/api/members/') and not request.path.startswith('/api/members/login/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/trainers/') and not request.path.startswith('/api/trainers/login/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/products/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/attendance/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/purchases/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/notifications/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/community/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/support/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/trainings/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/admin-members/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/admin-trainers/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/admin-community/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        elif request.path.startswith('/api/admin-support/'):
            print(f"✅ ALLOWING ADMIN ENDPOINT: {request.path}")
            return None
        
        # Allow access to Django admin
        if request.path.startswith('/admin/'):
            return None
        
        # Allow access to static files
        if request.path.startswith('/static/'):
            return None
        
        # Allow access to media files
        if request.path.startswith('/media/'):
            return None
        
        # Allow access to all API endpoints for authenticated admin users
        if request.user.is_authenticated and request.user.is_staff:
            print(f"✅ ALLOWING ADMIN ACCESS: {request.path}")
            return None
        
        # For API requests, return JSON response
        if request.path.startswith('/api/'):
            return JsonResponse({
                'detail': 'Sorry! The system is under maintenance mode. We will be back online shortly.',
                'maintenance_mode': True,
                'message': 'System Under Maintenance',
                'user_message': 'Sorry! The system is under maintenance mode. We will be back online shortly!'
            }, status=503)
        
        # For web requests, you could redirect to a maintenance page
        # For now, return JSON response for consistency
        return JsonResponse({
            'detail': 'Sorry! The system is under maintenance mode. We will be back online shortly.',
            'maintenance_mode': True,
            'message': 'System Under Maintenance',
            'user_message': 'Sorry! The system is under maintenance mode. We will be back online shortly!'
        }, status=503)
