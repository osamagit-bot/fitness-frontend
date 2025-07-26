from functools import wraps
from django.http import JsonResponse

def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        admin_user_id = request.session.get('admin_user_id')
        if not admin_user_id:
            return JsonResponse({
                'error': 'Admin authentication required',
                'redirect': '/admin-login'
            }, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper

def member_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        member_user_id = request.session.get('member_user_id')
        if not member_user_id:
            return JsonResponse({
                'error': 'Member authentication required', 
                'redirect': '/login'
            }, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper