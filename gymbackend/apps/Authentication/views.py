from django.conf import settings
import os
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from rest_framework import generics
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from apps.Authentication.models import CustomUser
from apps.Member.models import Member,Trainer,MembershipPayment
from apps.Purchase.models import Purchase
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, RegisterSerializer
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import permissions
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.http import JsonResponse
from django.urls import get_resolver, URLPattern, URLResolver
from django.middleware.csrf import get_token
from django.utils import timezone
from django.db.models import Sum
from django.contrib.auth import authenticate
import traceback
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis
from django.conf import settings
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()




class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit or delete it.
    """
    message = "You do not have permission to modify this object."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # For Post model
        if hasattr(obj, 'created_by') and obj.created_by:
            return obj.created_by == request.user
        
        # For Comment model
        if hasattr(obj, 'author') and obj.author:
            return obj.author == request.user

        return False



class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        token["role"] = user.role if hasattr(user, "role") else ""
        return token


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer



class AdminDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="stats")
    def dashboard_stats(self, request):
        try:
            total_members = Member.objects.count()
            total_trainers = Trainer.objects.count()

            now = timezone.now()

            monthly_revenue_shop = Purchase.objects.filter(
                date__month=now.month, date__year=now.year
            ).aggregate(total=Sum("total_price"))["total"] or 0

            monthly_renewal_revenue = MembershipPayment.objects.filter(
                paid_on__month=now.month, paid_on__year=now.year
            ).aggregate(total=Sum("amount"))["total"] or 0

            total_revenue = MembershipPayment.objects.aggregate(total=Sum("amount"))["total"] or 0

            total_monthly_revenue = monthly_revenue_shop + monthly_renewal_revenue

            days_in_month = (
                timezone.datetime(now.year + (now.month == 12), ((now.month % 12) + 1), 1) -
                timezone.datetime(now.year, now.month, 1)
            ).days

            daily_revenue = round(total_monthly_revenue / days_in_month, 2) if days_in_month > 0 else 0

            return Response({
                "total_members": total_members,
                "total_trainers": total_trainers,
                "monthly_revenue": f"{total_monthly_revenue:.2f} AFN",
                "monthly_revenue_shop": f"{monthly_revenue_shop:.2f} AFN",
                "monthly_renewal_revenue": f"{monthly_renewal_revenue:.2f} AFN",
                "daily_revenue": f"{daily_revenue:.2f} AFN",
                "total_revenue": f"{total_revenue:.2f} AFN",
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="login", permission_classes=[permissions.AllowAny])
    def login(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        print(f"🔐 ADMIN LOGIN ATTEMPT:")
        print(f"📧 Username/Email: {username}")
        print(f"🔑 Password provided: {'Yes' if password else 'No'}")
        
        # Try to find user by username OR email
        user_obj = None
        try:
            # First try username
            user_obj = CustomUser.objects.get(username=username)
            print(f"👤 User found by username: {user_obj.username}")
        except CustomUser.DoesNotExist:
            try:
                # Then try email
                user_obj = CustomUser.objects.get(email=username)
                print(f"👤 User found by email: {user_obj.email}")
            except CustomUser.DoesNotExist:
                print(f"❌ User does not exist: {username}")
                return Response({"detail": "Invalid credentials"}, status=401)
        
        print(f"🏢 Is staff: {user_obj.is_staff}")
        print(f"✅ Is active: {user_obj.is_active}")
        print(f"🔍 DEBUG - user_obj.username: '{user_obj.username}'")
        print(f"🔍 DEBUG - user_obj.email: '{user_obj.email}'")
        
        # Use username if available, otherwise use email for authentication
        auth_username = user_obj.username if user_obj.username else user_obj.email
        print(f"🔍 Authenticating with: '{auth_username}'")
        
        user = authenticate(username=auth_username, password=password)
        print(f"🔓 Authentication result: {user}")

        if user is not None and user.is_staff:
            refresh = RefreshToken.for_user(user)
            print(f"✅ Admin login successful for: {user.username or user.email}")
            return Response({
                "access_token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.pk,
                "username": user.username or user.email,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "is_admin": True,
            })
        elif user is None:
            print(f"❌ Authentication failed for: {auth_username}")
            return Response({"detail": "Invalid credentials"}, status=401)
        else:
            print(f"❌ User is not admin: {auth_username}")
            return Response({"detail": "User is not an admin"}, status=403)

    @action(detail=False, methods=["get", "post"], url_path="maintenance-mode")
    def maintenance_mode(self, request):
        """Handle maintenance mode toggle"""
        if not request.user.is_staff:
            return Response({"detail": "Admin access required"}, status=403)
        
        if request.method == "GET":
            # Get current maintenance mode status
        
            
            # Check if maintenance mode file exists
            maintenance_file = os.path.join(settings.BASE_DIR, '.maintenance_mode')
            is_enabled = os.path.exists(maintenance_file)
            
            return Response({"enabled": is_enabled})
        
        elif request.method == "POST":
            # Toggle maintenance mode
         
            enabled = request.data.get("enabled", False)
            maintenance_file = os.path.join(settings.BASE_DIR, '.maintenance_mode')
            
            try:
                if enabled:
                    # Create maintenance mode file
                    with open(maintenance_file, 'w') as f:
                        f.write(f"Maintenance mode enabled at {timezone.now()}")
                else:
                    # Remove maintenance mode file
                    if os.path.exists(maintenance_file):
                        os.remove(maintenance_file)
                
                return Response({"enabled": enabled, "message": f"Maintenance mode {'enabled' if enabled else 'disabled'}"})
            
            except Exception as e:
                return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["get"], url_path="export-members")
    def export_members(self, request):
        """Export all member data to CSV"""
        if not request.user.is_staff:
            return Response({"detail": "Admin access required"}, status=403)
        
        try:
            import csv
            from django.http import HttpResponse
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="members_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            writer = csv.writer(response)
            
            # Write header
            writer.writerow([
                'Athlete ID', 'First Name', 'Last Name', 'Username', 'Email', 
                'Phone', 'Membership Type', 'Start Date', 'Expiry Date',
                'Is Active', 'Monthly Fee', 'Time Slot', 'Box Number'
            ])
            
            # Write member data
            members = Member.objects.all().order_by('athlete_id')
            for member in members:
                try:
                    writer.writerow([
                        member.athlete_id,
                        member.first_name,
                        member.last_name,
                        getattr(member.user, 'username', '') if hasattr(member, 'user') and member.user else '',
                        getattr(member.user, 'email', '') if hasattr(member, 'user') and member.user else '',
                        getattr(member, 'phone', '') or '',
                        getattr(member, 'membership_type', '') or '',
                        member.start_date.strftime('%Y-%m-%d') if getattr(member, 'start_date', None) else '',
                        member.expiry_date.strftime('%Y-%m-%d') if getattr(member, 'expiry_date', None) else '',
                        getattr(member, 'is_active', True),
                        getattr(member, 'monthly_fee', '') or '',
                        getattr(member, 'time_slot', '') or '',
                        getattr(member, 'box_number', '') or ''
                    ])
                except Exception as field_error:
                    print(f"Error processing member {member.athlete_id}: {field_error}")
                    continue
            
            return response
            
        except Exception as e:
            print(f"Export error: {str(e)}")
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)




class AuthTestViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="test-auth")
    def test_auth(self, request):
        return Response({
            "message": "Authentication successful",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
                "role": getattr(request.user, "role", "unknown"),
            },
            "auth_type": str(request.auth.__class__) if request.auth else None,
        })

    @action(detail=False, methods=["get"], url_path="check")
    def check(self, request):
        return Response({
            "authenticated": True,
            "user_type": getattr(request.user, "role", "unknown"),
        })
    
    @action(detail=False, methods=["get"], url_path="user-roles")
    def user_roles(self, request):
        user_roles = [getattr(request.user, "role", "unknown")]
        
        # Check if user has multiple roles (optional)
        if hasattr(request.user, 'member') and hasattr(request.user, 'trainer'):
            user_roles = ['member', 'trainer']
        elif hasattr(request.user, 'member'):
            user_roles = ['member']
        elif request.user.is_staff:
            user_roles = ['admin']
            
        return Response({
            "roles": user_roles,
            "active_role": getattr(request.user, "role", "unknown")
        })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def test_jwt_view(request):
    return Response({"user": str(request.user), "is_authenticated": request.user.is_authenticated, "user_id": request.user.id})


class UserListView(generics.ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user, context=self.get_serializer_context()).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "token": str(refresh.access_token),
                "message": "User created successfully",
            },
            status=status.HTTP_201_CREATED,
        )
        
        
        


def get_csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def test_endpoint(request):
    return Response({"message": "Test endpoint is working"})


def test_view(request):
    return JsonResponse({"status": "success", "message": "Test view is working"})


def debug_urls(request):
    resolver = get_resolver()
    url_list = []

    def extract_view_name(callback):
        try:
            if hasattr(callback, "cls"):
                return callback.cls.__name__
            elif hasattr(callback, "__name__"):
                return callback.__name__
            elif hasattr(callback, "__class__"):
                return callback.__class__.__name__
        except Exception:
            return str(callback)
        return "UnknownView"

    def collect_urls(patterns, base=""):
        for pattern in patterns:
            if isinstance(pattern, URLPattern):
                path = f"{base}{pattern.pattern}"
                view_name = extract_view_name(pattern.callback)
                url_list.append({"url": str(path), "view": view_name})
            elif isinstance(pattern, URLResolver):
                nested_base = f"{base}{pattern.pattern}"
                collect_urls(pattern.url_patterns, nested_base)

    collect_urls(resolver.url_patterns)

    url_list.sort(key=lambda x: x["url"])

    return JsonResponse({"urls": url_list}, json_dumps_params={"indent": 2})



class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except TokenError as e:
            print(f"🚨 Token refresh error: {str(e)}")
            return Response({
                'detail': 'Token is invalid or expired',
                'code': 'token_not_valid'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            print(f"🚨 Unexpected token refresh error: {str(e)}")
            
            # Check if it's a user deletion issue
            if "CustomUser matching query does not exist" in str(e):
                print("🚨 User was deleted but token still exists - clearing session")
                
                # Try to get user info from token to determine user type
                try:
                    refresh_token = request.data.get('refresh')
                    if refresh_token:
                        from rest_framework_simplejwt.tokens import RefreshToken
                        token = RefreshToken(refresh_token)
                        user_id = token.get('user_id')
                        print(f"🔍 Deleted user ID from token: {user_id}")
                except Exception as token_error:
                    print(f"⚠️ Could not extract user info from token: {token_error}")
                
                return Response({
                    'detail': 'User account no longer exists',
                    'code': 'user_deleted',
                    'action': 'logout',
                    'user_type': 'member'  # Assume member since admin accounts aren't deleted
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            return Response({
                'detail': 'Token refresh failed',
                'code': 'token_refresh_failed'
            }, status=status.HTTP_401_UNAUTHORIZED)



def home(request):
    
    return render(request, 'admin/home.html')




@api_view(['GET'])

@permission_classes([IsAuthenticated])
def check_auth(request):
    try:
        user = request.user
        print(f"🔍 Auth check - User: {user}")
        
        # Try to get member data
        member_data = None
        try:
            from apps.Member.models import Member
            member = Member.objects.get(user=user)
            member_data = {
                'athlete_id': member.athlete_id,
                'member_id': member.athlete_id,
                'first_name': member.first_name,
                'last_name': member.last_name,
                'biometric_registered': getattr(member, 'biometric_registered', False)
            }
            print(f"🔍 Found member: {member_data}")
        except Member.DoesNotExist:
            print(f"🚨 No member found for user: {user}")
        
        response_data = {
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
        
        # Add member data if available
        if member_data:
            response_data.update(member_data)
        
        return Response(response_data)
    except Exception as e:
        print(f"🚨 Auth check error: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Production health check endpoint"""
    try:
        # Check database
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Check Redis
        from django.core.cache import cache
        cache.set('health_check', 'ok', 30)
        cache_status = cache.get('health_check') == 'ok'
        
        return Response({
            'status': 'healthy',
            'database': 'connected',
            'cache': 'connected' if cache_status else 'disconnected',
            'timestamp': timezone.now().isoformat()
        })
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)


class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend that allows users to authenticate using either email or username
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        print(f"🔍 Custom backend called with username: {username}")
        
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        if username is None or password is None:
            print(f"❌ Missing credentials: username={username}, password={'***' if password else None}")
            return None
        
        try:
            # Try to find user by email or username
            if '@' in username:
                # It's an email
                user = User.objects.get(email__iexact=username)
                print(f"✅ Found user by email: {user}")
            else:
                # It's a username
                user = User.objects.get(username__iexact=username)
                print(f"✅ Found user by username: {user}")
        except User.DoesNotExist:
            print(f"❌ User not found: {username}")
            # Run the default password hasher once to reduce timing differences
            User().set_password(password)
            return None
        
        password_valid = user.check_password(password)
        can_auth = self.user_can_authenticate(user)
        print(f"🔑 Password valid: {password_valid}")
        print(f"👤 Can authenticate: {can_auth}")
        
        if password_valid and can_auth:
            print(f"✅ Authentication successful: {user}")
            return user
        
        print(f"❌ Authentication failed")
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

