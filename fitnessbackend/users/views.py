from django.shortcuts import render
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import AllowAny
from rest_framework import serializers, status, viewsets
from .serializers import RegisterSerializer, UserSerializer
from django.db.models import Q
import logging
logger = logging.getLogger(__name__)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAdminUser
from django.urls.resolvers import URLPattern, URLResolver
from django.utils.dateparse import parse_date
from datetime import date
import traceback
from .permissions import IsOwnerOrReadOnly
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notification
from .serializers import NotificationSerializer
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from django.views.decorators.http import require_GET
from django.contrib.auth.hashers import make_password
from rest_framework.views import APIView

from twilio.rest import Client
from django.conf import settings
from .models import (
    Member, Product, Trainer, Training,Comment, CustomUser, Attendance, Notification,
 
    Post, Announcement, Challenge, SupportTicket, FAQ, FAQCategory, TicketResponse, Purchase
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    MemberSerializer, CustomTokenObtainPairSerializer, ProductSerializer, 
    TrainerSerializer, TrainingSerializer, PurchaseSerializer,AttendanceSerializer,
  
    PostSerializer, AnnouncementSerializer,CommentSerializer, ChallengeSerializer,FAQSerializer,
    SupportTicketSerializer, FAQCategorySerializer, TicketResponseSerializer,CommentSerializer
)
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.http import JsonResponse, Http404
from django.middleware.csrf import get_token
from django.urls import path

from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Sum
from django.db import transaction
from datetime import datetime, date as datetime_date, timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.urls import get_resolver
from rest_framework import viewsets, permissions, status, generics

from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt

User = get_user_model()

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role if hasattr(user, 'role') else ''
        
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        return data

# Then define the view that uses it
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer





#Homepage

def Home(request):
    return render(request,"home.html")














class AdminDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    
    @action(detail=False, methods=['get'], url_path='stats')
    def dashboard_stats(self, request):
        """Admin dashboard stats including shop revenue"""
        try:
            total_members = Member.objects.count()
            total_trainers = Trainer.objects.count()

            # Sum of monthly fees from all members
            monthly_revenue_members = Member.objects.aggregate(
                Sum('monthly_fee')
            )['monthly_fee__sum'] or 0

            # Sum of shop purchases (total_price)
            monthly_revenue_shop = Purchase.objects.filter(
                date__month=timezone.now().month,
                date__year=timezone.now().year
            ).aggregate(Sum('total_price'))['total_price__sum'] or 0

            # Combine both sources of revenue
            total_monthly_revenue = monthly_revenue_members + monthly_revenue_shop

            # Calculate daily revenue
            now = timezone.now()
            days_in_month = (timezone.datetime(
                now.year + (now.month == 12),
                ((now.month % 12) + 1), 1
            ) - timezone.datetime(now.year, now.month, 1)).days

            daily_revenue = round(total_monthly_revenue / days_in_month, 2) if days_in_month > 0 else 0

            return Response({
                'total_members': total_members,
                'total_trainers': total_trainers,
                'monthly_revenue': f"{total_monthly_revenue:.2f} AFN",
                'monthly_revenue_members': f"{monthly_revenue_members:.2f} AFN",
                'monthly_revenue_shop': f"{monthly_revenue_shop:.2f} AFN",
                'daily_revenue': f"{daily_revenue:.2f} AFN",
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='login', permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Admin login"""
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user is not None and user.is_staff:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access_token': str(refresh.access_token),
                'refresh': str(refresh),
                'user_id': user.pk,
                'username': user.username,
                'is_admin': True
            })
        elif user is None:
            return Response({'detail': 'Invalid credentials'}, status=401)
        else:
            return Response({'detail': 'User is not an admin'}, status=403)
        
        
        

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        if lookup_url_kwarg in self.kwargs:
            pk_value = self.kwargs[lookup_url_kwarg]
            try:
                return super().get_object()
            except Http404:
                queryset = self.filter_queryset(self.get_queryset())
                try:
                    member = queryset.get(athlete_id=pk_value)
                    self.check_object_permissions(self.request, member)
                    return member
                except Member.DoesNotExist:
                    raise Http404(f"No Member matches the given query: {pk_value}")
        return super().get_object()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_expiry_date = instance.expiry_date

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        new_expiry_date = serializer.instance.expiry_date
        if new_expiry_date != old_expiry_date:
            instance.notified_expired = False
            instance.save()
            Notification.objects.filter(
                message__icontains=f"Membership expired for: {instance.first_name} {instance.last_name}",
                is_read=False
            ).delete()
            Notification.objects.create(
                message=f"Membership renewed for: {instance.first_name} {instance.last_name}"
            )
        return Response(serializer.data)

    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        data = request.data
        email = data.get('email', '').strip().lower()

        
        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": "Email already exists."}, status=400)

        username = f"{data.get('first_name', '').lower()}{data.get('athlete_id', '')}"

        if CustomUser.objects.filter(username=username).exists():
            return Response({"error": "Username already taken."}, status=400)
        

       
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=data.get('password')
        )
        user.role = 'member'
        user.save()

        member_data = data.copy()
        member_data['user'] = user.id
        member_data['email'] = email  # Add real email here to avoid temp email fallback in serializer
        serializer = self.get_serializer(data=member_data)
        if serializer.is_valid():
            member = serializer.save()
            Notification.objects.create(message=f"New member registered: {member.first_name} {member.last_name}")
            return Response({
                "message": "Member registered successfully",
                "member": serializer.data,
                "auth": {"username": user.username, "email": user.email}
            }, status=201)
        else:
            user.delete()
            return Response({"error": serializer.errors}, status=400)

        
        
        
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        login_input = request.data.get('username')
        password = request.data.get('password')

        print(f"Login attempt with username/email: {login_input}")

        try:
            # Find user by username or email, AND role must be member
            user = CustomUser.objects.filter(
                Q(username=login_input) | Q(email=login_input),
                role=CustomUser.Role.MEMBER  # ensure only member can login here
            ).first()

            if not user:
                print("User not found or not a member")
                return Response({'error': 'User not found or not a member'}, status=404)

            # Now get member object
            member = Member.objects.get(user=user)

        except (CustomUser.DoesNotExist, Member.DoesNotExist) as e:
            print(f"Exception during login: {e}")
            return Response({"detail": "Invalid credentials"}, status=401)

        authenticated_user = authenticate(username=user.email, password=password)
        print(f"Authentication result: {'Success' if authenticated_user else 'Failed'}")

        if authenticated_user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "member_id": member.athlete_id,
                "athlete_id": member.athlete_id,
                "name": f"{member.first_name} {member.last_name}"
            })
        elif check_password(password, user.password):
            # Fallback: password matches but authenticate() failed
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "member_id": member.athlete_id,
                "athlete_id": member.athlete_id,
                "name": f"{member.first_name} {member.last_name}"
            })
        else:
            print("Incorrect password")
            return Response({"detail": "Incorrect password"}, status=401)



    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        member = self.get_object()
        serializer = self.get_serializer(member)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        member = self.get_object()
        now = timezone.now()
        days_remaining = max(0, (member.expiry_date - now.date()).days if member.expiry_date else 0)
        upcoming_sessions = []  # Populate as needed
        status_value = "Active" if member.membership_status else "Inactive"
        return Response({
            'name': f"{member.first_name} {member.last_name}",
            'days_remaining': days_remaining,
            'next_payment_date': member.next_payment_date.strftime('%B %d, %Y') if member.next_payment_date else "No payment due",
            'status': status_value,
            'upcoming_sessions': upcoming_sessions
        })

    @action(detail=True, methods=['put', 'patch'])
    def update_profile(self, request, pk=None):
        member = self.get_object()
        serializer = self.get_serializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            Notification.objects.create(message=f"Member Profile Updated For: {member.first_name} {member.last_name}")
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        member = self.get_object()
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        if not check_password(current_password, member.user.password):
            return Response({"detail": "Current password incorrect."}, status=400)
        member.user.set_password(new_password)
        member.user.save()
        refresh = RefreshToken.for_user(member.user)
        return Response({"message": "Password changed", "token": str(refresh.access_token), "refresh": str(refresh)})

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        member_id = request.data.get('member_id')
        new_password = request.data.get('new_password')
        try:
            member = Member.objects.get(athlete_id=member_id)
            member.user.password = make_password(new_password)
            member.user.save()
            return Response({"detail": "Password reset successful"})
        except Member.DoesNotExist:
            return Response({"detail": "Member not found"}, status=404)

    @action(detail=False, methods=['get'])
    def all_members(self, request):
        members = Member.objects.all()
        data = []
        for member in members:
            data.append({
                'id': member.pk,
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'username': member.user.username if member.user else '',
                'email': member.user.email if member.user else '',
            })
        return Response({"members": data})

    @action(detail=False, methods=['get'])
    def get_member_pk(self, request):
        try:
            return Response({'member_pk': request.user.member.pk})
        except Member.DoesNotExist:
            return Response({'error': 'No member profile found.'}, status=404)

   
   
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def request_delete(self, request):
        user = request.user
        print(f"Request user: email={user.email}, role={user.role}, id={user.id}, is_staff={user.is_staff}, is_superuser={user.is_superuser}")

        member = getattr(user, 'member', None)
        print(f"Member attached: {member}")

        if member:
            member.delete_requested = True
            member.save()

            Notification.objects.create(
                user=user,
                message=f"Member '{user.username}' has requested account deletion."
            )
            return Response({"detail": "Member account deletion request sent."}, status=status.HTTP_200_OK)

        if user.is_staff or user.is_superuser:
            return Response({"detail": "Admins cannot request account deletion here."}, status=status.HTTP_403_FORBIDDEN)

        return Response({"detail": "User profile type not supported for deletion."}, status=status.HTTP_400_BAD_REQUEST)




    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        member = self.get_object()
        member.start_date = request.data.get('start_date', member.start_date)
        member.expiry_date = request.data.get('expiry_date', member.expiry_date)
        member.notified_expired = False
        member.save()
        Notification.objects.create(message=f"Membership renewed for: {member.first_name} {member.last_name}")
        return Response({"message": "Member renewed", "member": self.get_serializer(member).data})

        
        
        
        
'''    
    
@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([permissions.IsAuthenticated])
def register_member_with_auth(request):
    """
    Register a new member with authentication credentials
    """
    try:
        # Extract data from request
        data = request.data
        
        # Generate a username from first name and athlete ID
        username = f"{data.get('first_name', '').lower()}{data.get('athlete_id', '')}"
        
        # Check if the username is already taken
        if User.objects.filter(username=username).exists():
            return Response(
                {"error": f"Username {username} is already taken."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create a new user
        user = User.objects.create_user(
            username=username,
            email=data.get('email', ''),
            password=data.get('password'),
        )
        
        # Set the user's role to 'member'
        user.role = 'member'
        user.save()
        
        # Create the member object
        member_data = {
            'athlete_id': data.get('athlete_id'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'monthly_fee': data.get('monthly_fee'),
            'membership_type': data.get('membership_type'),
            'box_number': data.get('box_number'),
            'time_slot': data.get('time_slot'),
            'start_date': data.get('start_date'),
            'expiry_date': data.get('expiry_date'),
            'user': user.id
        }
        
        serializer = MemberSerializer(data=member_data)
        if serializer.is_valid():
            member = serializer.save()
            Notification.objects.create(
            message=f"New member registered: {member.first_name} {member.last_name}"
    )
            if member.phone:
                send_welcome_sms(member.phone, member.first_name)
            return Response({
                "message": "Member registered successfully with authentication",
                "member": serializer.data,
                "auth": {
                    "username": username,
                    "email": user.email,
                }
            }, status=status.HTTP_201_CREATED)
        else:
            # If the member creation fails, delete the user
            user.delete()
            return Response({
                "error": "Invalid member data",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def member_login(request):
    """Member login endpoint with enhanced debugging"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"Member login attempt: {username}")
    
    # Check if user exists
    try:
        user_obj = CustomUser.objects.get(username=username)
        print(f"User exists: id={user_obj.id}, active={user_obj.is_active}")
        
        # Check if member exists
        try:
            member = Member.objects.get(user=user_obj)
            print(f"Member profile found: athlete_id={member.athlete_id}")
        except Member.DoesNotExist:
            print("No member profile found for this user")
            return Response({"detail": "No member profile found for this username"}, 
                          status=status.HTTP_403_FORBIDDEN)
    except CustomUser.DoesNotExist:
        print(f"User not found: {username}")
        return Response({"detail": "Username not found"}, 
                      status=status.HTTP_401_UNAUTHORIZED)
    
    # Attempt authentication
    user = authenticate(username=username, password=password)
    print(f"Authentication result: {'Success' if user else 'Failed'}")
    
    if user is not None:
        # Standard authentication worked
        member = Member.objects.get(user=user)
        
        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        print(f"Generated token for member: {member.first_name}")
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'member_id': member.athlete_id,
            'name': f"{member.first_name} {member.last_name}"
        })
    else:
        # Try direct password verification as fallback
        try:
            from django.contrib.auth.hashers import check_password
            
            if check_password(password, user_obj.password):
                print("Password matches but authenticate() failed - using fallback")
                
                # Get member profile
                member = Member.objects.get(user=user_obj)
                
                # Generate JWT token manually
                refresh = RefreshToken.for_user(user_obj)
                print(f"Generated token for member: {member.first_name}")
                
                return Response({
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user_id': user_obj.id,
                    'member_id': member.athlete_id,
                    'name': f"{member.first_name} {member.last_name}"
                })
            else:
                print(f"Incorrect password for user: {username}")
                return Response({"detail": "Incorrect password"}, 
                              status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            print(f"Error in fallback authentication: {str(e)}")
            return Response({"detail": "Authentication error"}, 
                          status=status.HTTP_401_UNAUTHORIZED)
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([permissions.IsAuthenticated])
def get_member_profile(request):
    """Get the profile of the currently logged-in member"""
    try:
        # Find the member associated with the current user
        member = Member.objects.get(user=request.user)
        serializer = MemberSerializer(member)
        return Response(serializer.data)
    except Member.DoesNotExist:
        return Response(
            {"detail": "No member profile found for this user"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_dashboard(request, member_id):
    """
    Get dashboard data for a specific member
    """
    try:
        # Check if request user is the same as the member being requested
        member = Member.objects.get(athlete_id=member_id)
        
        # Only allow if the authenticated user is linked to this member
        if request.user.id != member.user.id:
            return Response(
                {"detail": "You don't have permission to view this dashboard."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Get current month for stats
        current_date = timezone.now()
        month_start = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        # Calculate days remaining in membership
        days_remaining = 30  # Default
        if member.membership_end:
            delta = member.membership_end - current_date.date()
            days_remaining = max(0, delta.days)
            
        # Count visits this month
  
        # Get upcoming training sessions
        upcoming_sessions = Training.objects.filter(
            member=member,
            date__gte=current_date.date()
        ).order_by('date', 'time')[:3]  # Get up to 3 upcoming sessions
        
        # Format upcoming sessions
        sessions_data = []
        for session in upcoming_sessions:
            trainer_name = "Unknown Trainer"
            if session.trainer:
                trainer_name = f"{session.trainer.first_name} {session.trainer.last_name}"
                
            sessions_data.append({
                'title': session.name,
                'date': session.date.strftime('%B %d, %Y'),
                'time': session.time.strftime('%I:%M %p'),
                'trainer': trainer_name
            })
        
        # Get membership status
        status_value = "Inactive"
        if member.membership_status:
            status_value = "Active"
            
        # Format next payment date
        next_payment = "No payment due"
        if member.next_payment_date:
            next_payment = member.next_payment_date.strftime('%B %d, %Y')
        
        return Response({
            'name': f"{member.first_name} {member.last_name}",
            'days_remaining': days_remaining,
          
            'next_payment_date': next_payment,
            'status': status_value,
            'upcoming_sessions': sessions_data
        })
    
    except Member.DoesNotExist:
        return Response(
            {"detail": "Member not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    



@api_view(['GET'])
def get_member_details(request, member_id):
    """Get member details for dashboard or profile"""
    try:
        print(f"Looking for member with ID: {member_id}")
        member = Member.objects.get(athlete_id=member_id)
        print(f"Found member: {member.first_name} {member.last_name}")
        
        # Get user data
        user = member.user
        
        # Calculate days remaining
        today = timezone.now().date()
        start_date = timezone.now().date()  # Fallback
        
        # Try to get actual start date from member object
        if hasattr(member, 'created_at'):
            if hasattr(member.created_at, 'date'):
                start_date = member.created_at.date()
        
        # Assume 30-day membership
        expiry_date = start_date + timedelta(days=30)
        days_remaining = max(0, (expiry_date - today).days)
        
        # Format dates for display
        formatted_start_date = start_date.strftime('%b %d, %Y')
        formatted_expiry_date = expiry_date.strftime('%b %d, %Y')
        
        # Create response data
        data = {
            "id": member_id,
            "name": f"{member.first_name} {member.last_name or ''}".strip(),
            "username": user.username,
            "email": user.email or '',
            "phone": getattr(member, 'phone', 'Not set'),
            "membershipType": "Active Member",
            "memberTier": "Gold Member",
            "registeredOn": timezone.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
            "status": "Active",
            "days_remaining": days_remaining,
            "start_date": formatted_start_date,
            "expiry_date": formatted_expiry_date,
            "time": getattr(member, 'preferred_time', 'Evening'),
            "box": getattr(member, 'locker_number', '11'),
            "fee": "447.00 AFN",
            "type": "Gym"
        }
        
        print(f"Returning data: {data}")
        return Response(data)
    
    except Member.DoesNotExist:
        print(f"Member not found: {member_id}")
        return Response(
            {"detail": f"Member with ID {member_id} not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"Error in get_member_details: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    




@api_view(['GET', 'PUT', 'PATCH'])
def update_member_profile(request, member_id):
    """
    GET: Retrieve member profile
    PUT/PATCH: Update member profile
    """
    try:
        member = Member.objects.get(athlete_id=member_id)
    except Member.DoesNotExist:
        return Response({"detail": f"No Member matches the given query: {member_id}"}, status=404)
    
    if request.method == 'GET':
        serializer = MemberSerializer(member)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = MemberSerializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_member_password(request, member_id):
    """Change member password"""
    try:
        member = Member.objects.get(athlete_id=member_id)
        
        # Ensure the authenticated user is linked to this member
        if request.user.id != member.user.id and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to change this password."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get password data
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        # Verify current password
        if not check_password(current_password, request.user.password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user = request.user
        user.set_password(new_password)
        user.save()
        
    
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        return Response({
            "message": "Password changed successfully",
            "token": access_token,
            "refresh": str(refresh)
        })
    
    except Member.DoesNotExist:
        return Response(
            {"detail": "Member not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.AllowAny])  # For testing, change to IsAuthenticated later
def update_member_profile(request, member_id):
    """Get or update member profile"""
    try:
     
        member = None
        try:
            member = Member.objects.get(athlete_id=member_id)
        except Member.DoesNotExist:
            try:
                member = Member.objects.get(pk=member_id)
            except Member.DoesNotExist:
                return Response({"detail": f"Member not found with ID: {member_id}"}, status=404)
        
        if request.method == 'GET':
            serializer = MemberSerializer(member)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            serializer = MemberSerializer(member, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                Notification.objects.create(
            message=f"Member Profile Updated Successfully For: {member.first_name} {member.last_name}"
    )
       
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        return Response({"detail": str(e)}, status=500)
    






@api_view(['POST', 'PUT'])  # Accept both POST and PUT methods
@permission_classes([IsAuthenticated])
def reset_member_password(request):
    """Reset a member's password"""
    member_id = request.data.get('member_id')
    new_password = request.data.get('new_password')
    
    if not member_id or not new_password:
        return Response({'detail': 'Member ID and new password are required'}, status=400)
        
    try:
        # Find the member
        member = Member.objects.get(athlete_id=member_id)
        
        # Update the user's password if member has a user
        if hasattr(member, 'user') and member.user:
            user = member.user
            user.password = make_password(new_password)
            user.save()
            
            # Also store raw password for debugging
            if hasattr(member, 'raw_password'):
                member.raw_password = new_password
                member.save()
            
            return Response({'detail': 'Password reset successful'})
        else:
            return Response({'detail': 'Member has no associated user account'}, status=404)
            
    except Member.DoesNotExist:
        return Response({'detail': 'Member not found'}, status=404)
    except Exception as e:
        return Response({'detail': str(e)}, status=500)
    


@csrf_exempt
def member_dashboard(request, member_id):
    """Get member dashboard data"""
    try:
        # Try to find the member
        member = Member.objects.get(athlete_id=member_id)
        

        recent_attendance = []
        try:
            attendance_records = Attendance.objects.filter(
                member=member
            ).order_by('-date')[:5]  
            
            for record in attendance_records:
                if hasattr(record, 'check_in_time'):
                    # Format time nicely if it exists
                    if hasattr(record, 'formatted_time'):
                        time_str = record.formatted_time
                    elif isinstance(record.check_in_time, datetime.datetime):
                        time_str = record.check_in_time.strftime('%I:%M %p')
                    else:
                        time_str = str(record.check_in_time)
                    
                    recent_attendance.append({
                        'id': record.id,
                        'date': str(record.date),
                        'check_in_time': time_str
                    })
        except Exception as e:
            print(f"Error fetching attendance: {e}")
         
        
        # Build the response with member data
        response_data = {
            'first_name': member.first_name,
            'last_name': member.last_name,
            'athlete_id': member.athlete_id,
            'membership_type': member.membership_type,
            'expiry_date': str(member.expiry_date),
            'monthly_fee': str(member.monthly_fee),
            'next_payment_date': str(member.expiry_date),  # Or calculate next payment date
            'payment_status': 'Paid',  # Placeholder - implement actual logic
            'recent_attendance': recent_attendance,
            # Safely check if biometric fields exist
            'biometric_registered': hasattr(member, 'biometric_registered') and member.biometric_registered
        }
        
        return JsonResponse(response_data)
        
    except Member.DoesNotExist:
        return JsonResponse({'error': 'Member not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in member_dashboard: {e}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    

@csrf_exempt
def get_member_details(request, member_id):
    """Get detailed information for a single member"""
    try:
        member = Member.objects.get(athlete_id=member_id)
        
        # Get recent attendance records
        recent_attendance = []
        try:
            attendance_records = Attendance.objects.filter(
                member=member
            ).order_by('-date')[:5]
            
            for record in attendance_records:
                if hasattr(record, 'check_in_time'):
                    recent_attendance.append({
                        'id': record.id,
                        'date': str(record.date),
                        'check_in_time': str(record.check_in_time)
                    })
        except Exception as e:
            print(f"Error fetching attendance: {e}")
        
        # Build response data
        response_data = {
            'id': member.pk,
            'athlete_id': member.athlete_id,
            'first_name': member.first_name,
            'last_name': member.last_name,
            'monthly_fee': str(member.monthly_fee),
            'membership_type': member.membership_type,
            'start_date': str(member.start_date),
            'expiry_date': str(member.expiry_date),
            'box_number': member.box_number,
            'time_slot': member.time_slot,
            'email': member.user.email if hasattr(member, 'user') and member.user else '',
            'recent_attendance': recent_attendance,
            'biometric_registered': hasattr(member, 'biometric_registered') and member.biometric_registered
        }
        
        return JsonResponse(response_data)
    
    except Member.DoesNotExist:
        return JsonResponse({'error': 'Member not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in get_member_details: {e}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    




@csrf_exempt
def member_dashboard(request, member_id):
    """Get data for the member dashboard"""
    try:
        # Try to find the member
        member = Member.objects.get(athlete_id=member_id)
        
        # Get recent attendance
        recent_attendance = []
        try:
            attendance_records = Attendance.objects.filter(
                member=member
            ).order_by('-date')[:5]  # Get 5 most recent records
            
            for record in attendance_records:
                time_str = "N/A"
                if hasattr(record, 'check_in_time'):
                    if isinstance(record.check_in_time, datetime.datetime):
                        time_str = record.check_in_time.strftime('%I:%M %p')
                    else:
                        time_str = str(record.check_in_time)
                
                recent_attendance.append({
                    'id': record.id,
                    'date': str(record.date),
                    'check_in_time': time_str
                })
        except Exception as e:
            print(f"Error fetching attendance: {e}")
            # Continue even if attendance fetching fails
        
        # Build response data
        response_data = {
            'id': member.pk,
            'athlete_id': member.athlete_id,
            'first_name': member.first_name,
            'last_name': member.last_name,
            'monthly_fee': str(member.monthly_fee),
            'membership_type': member.membership_type,
            'start_date': str(member.start_date),
            'expiry_date': str(member.expiry_date),
            'box_number': member.box_number,
            'time_slot': member.time_slot,
            'email': member.user.email if hasattr(member, 'user') and member.user else '',
            'recent_attendance': recent_attendance,
            'biometric_registered': hasattr(member, 'biometric_registered') and member.biometric_registered,
            'payment_status': 'Paid',  # This is a placeholder - implement real payment status
            'next_payment_date': str(member.expiry_date)  # This is a placeholder - implement real next payment date
        }
        
        return JsonResponse(response_data)
    
    except Member.DoesNotExist:
        return JsonResponse({'error': f'Member with ID {member_id} not found'}, status=404)
    except Exception as e:
        import traceback
        print(f"Error in member_dashboard: {e}")
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    

def list_all_members(request):
    """List all members in the database with full credentials for debugging"""
    try:
        members = Member.objects.all()
        member_list = []
        
        for member in members:
            # Get associated user if exists
            user = None
            raw_password = None
            
            # Try to get the user and password from various sources
            if hasattr(member, 'user') and member.user:
                user = member.user
            
            # Check for stored raw password
            if hasattr(member, 'raw_password') and member.raw_password:
                raw_password = member.raw_password
            
            # Get password from session or cache if available
            member_credentials = None
            try:
                # Try to get from session or cache by athlete_id
                from django.core.cache import cache
                member_credentials = cache.get(f'member_credentials_{member.athlete_id}')
            except:
                pass
                
            member_data = {
                'id': member.pk,
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'username': getattr(user, 'username', None) if user else getattr(member, 'username', None),
                'email': getattr(user, 'email', None) if user else getattr(member, 'email', None),
                'password': raw_password or (member_credentials.get('password') if member_credentials else None),
            }
            
            member_list.append(member_data)
        
        return JsonResponse({'members': member_list})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([permissions.IsAuthenticated])
def register_member(request):
    """
    Register a new member with user account based on frontend data
    """
    try:
        # Extract data from request
        data = request.data
        print("Received member data:", data)
        
        # Create the member object with auth fields included
        serializer = MemberSerializer(data=data)
        if serializer.is_valid():
            member = serializer.save()
            Notification.objects.create(
            message=f"New member registered: {member.first_name} {member.last_name}"
    )
            
            # Get the actual username that was created
            actual_username = member.user.username
            
            # Check for primary key field - use pk which is always available
            member_id = member.pk  # Use .pk instead of .id
            
            return Response({
                "message": f"Member registered successfully: {member.first_name} {member.last_name}",
                "member": {
                    "pk": member_id,  # Changed from id to pk
                    "athlete_id": member.athlete_id,
                    "first_name": member.first_name,
                    "last_name": member.last_name
                },
                "auth": {
                    "username": actual_username,
                    "email": member.user.email if hasattr(member.user, 'email') else "",
                }
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "error": "Invalid member data",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        print(f"Error registering member: {str(e)}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        



class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    # Temporarily set to AllowAny for testing
    permission_classes = [permissions.AllowAny]
    # Uncomment when ready to enforce auth
    # permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    
    def get_object(self):
        """
        Allow looking up a member by athlete_id from the URL or by primary key
        """
        # Try to get the object by primary key first
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        if lookup_url_kwarg in self.kwargs:
            pk_value = self.kwargs[lookup_url_kwarg]
            # Try primary key lookup
            try:
                return super().get_object()
            except Http404:
                # Try by athlete_id instead
                queryset = self.filter_queryset(self.get_queryset())
                try:
                    # Log what we're trying to find
                    print(f"Looking for member with athlete_id={pk_value}")
                    member = queryset.get(athlete_id=pk_value)
                    # May raise a PermissionDenied
                    self.check_object_permissions(self.request, member)
                    return member
                except Member.DoesNotExist:
                    print(f"No member found with athlete_id={pk_value}")
                    # If we couldn't find by athlete_id, re-raise the original Http404
                    raise Http404(f"No Member matches the given query: {pk_value}")
        return super().get_object()
    
    
    def destroy(self, request, *args, **kwargs):
        """
        Custom destroy method with better error handling
        """
        try:
            instance = self.get_object()
            print(f"Destroying member with athlete_id={instance.athlete_id}, user_id={instance.user_id}")
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Http404 as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"Error deleting member: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated]) 
    def renew(self, request, pk=None):
        """
        Custom action to renew a member's membership and send a notification.
        """
        print("Renew method called for member with pk:", pk)
        member = self.get_object()

        # Update start_date and expiry_date from request data
        member.start_date = request.data.get('start_date', member.start_date)
        member.expiry_date = request.data.get('expiry_date', member.expiry_date)
        # Reset notified_expired flag on renewal
        member.notified_expired = False
        member.save()
        print(f"Creating notification for membership renewal of {member.first_name} {member.last_name}")
        Notification.objects.create(
            message=f"Membership renewed for: {member.first_name} {member.last_name}"
        )
        print("Notification created successfully")

        return Response({
        "message": "Member renewed successfully.",
        "member": MemberSerializer(member).data
    }, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """
        Override update method to handle renew notifications
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_expiry_date = instance.expiry_date

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        new_expiry_date = serializer.instance.expiry_date

        if new_expiry_date != old_expiry_date:
            # Expiry date changed, treat as renewal
            instance.notified_expired = False
            instance.save()
            # Mark expired notifications for this member as read or remove them
            expired_notifications = Notification.objects.filter(
                message__icontains=f"Membership expired for: {instance.first_name} {instance.last_name}",
                is_read=False
            )
            # Delete expired notifications instead of marking as read
            expired_notifications.delete()
            Notification.objects.create(
                message=f"Membership renewed for: {instance.first_name} {instance.last_name}"
            )
            print(f"Renew notification created for member {instance.first_name} {instance.last_name}")

        return Response(serializer.data)
            
    
    def perform_create(self, serializer):
        """Custom method to handle member creation"""
        try:
            # Let the serializer handle creation with all the data
            member = serializer.save()
            return member
        except Exception as e:
            # Better error handling
            raise serializers.ValidationError(f"Error creating member: {str(e)}")
    
    def metadata(self, request):
        return super().metadata(request)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            member = self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except serializers.ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Add for debugging
    @action(detail=False, methods=['get'])
    def test_auth(self, request):
        return Response({
            "message": "Authentication successful",
            "user": request.user.email if request.user.is_authenticated else "Anonymous",
            "is_authenticated": request.user.is_authenticated,
            "auth_type": str(request.auth.__class__) if request.auth else None
        })

    # Add an endpoint to get a member by athlete_id
    @action(detail=False, methods=['get'], url_path='by-athlete-id/(?P<athlete_id>[^/.]+)')
    def by_athlete_id(self, request, athlete_id=None):
        try:
            member = Member.objects.get(athlete_id=athlete_id)
            serializer = self.get_serializer(member)
            return Response(serializer.data)
        except Member.DoesNotExist:
            return Response(
                {"detail": f"No member found with athlete_id: {athlete_id}"},
                status=status.HTTP_404_NOT_FOUND
            )



        return queryset
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_member_pk(request):
    try:
        member = request.user.member  # If you have a OneToOneField from CustomUser to Member
        return Response({'member_pk': member.pk})
    except Member.DoesNotExist:
        return Response({'error': 'No member profile found.'}, status=404)
    
    '''
    
        
        
        
        
        
        
        

class TrainerViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.all()
    serializer_class = TrainerSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]

    def list(self, request, *args, **kwargs):
        try:
            trainers = Trainer.objects.all()
            trainer_data = []
            for trainer in trainers:
                data = {
                    'id': trainer.id,
                    'trainer_id': trainer.trainer_id,
                    'first_name': trainer.first_name,
                    'last_name': trainer.last_name,
                    'email': trainer.email,
                    'phone': trainer.phone,
                    'monthly_salary': str(trainer.monthly_salary),
                    'specialization': trainer.specialization,
                    'start_date': str(trainer.start_date),
                    'user': trainer.user.id if trainer.user else None,
                    'username': trainer.user.username if trainer.user else 'N/A',
                    'password': trainer.user.password if trainer.user else 'N/A',
                }
                trainer_data.append(data)
            return Response(trainer_data)
        except Exception as e:
            import traceback
            print(f"Error in trainer list: {e}")
            print(traceback.format_exc())
            return Response({"error": f"Failed to list trainers: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            data = request.data
            username = data.get('username')
            password = data.get('password')
            email = data.get('email', '')

            if not username or not password:
                return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username=username).exists():
                return Response({"error": f"User with username '{username}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create_user(username=username, password=password, email=email)

            trainer = Trainer.objects.create(
                user=user,
                trainer_id=data.get('trainer_id'),
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                email=email,
                phone=data.get('phone'),
                monthly_salary=data.get('monthly_salary'),
                specialization=data.get('specialization'),
                start_date=data.get('start_date')
            )

            Notification.objects.create(message=f"New trainer registered: {trainer.first_name} {trainer.last_name}")

            response_data = {
                'id': trainer.id,
                'trainer_id': trainer.trainer_id,
                'first_name': trainer.first_name,
                'last_name': trainer.last_name,
                'email': trainer.email,
                'phone': trainer.phone,
                'monthly_salary': str(trainer.monthly_salary),
                'specialization': trainer.specialization,
                'start_date': str(trainer.start_date),
                'user': user.id,
                'username': username,
                'password': password
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            print(f"Error in trainer creation: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Failed to create trainer: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        print(f"Trainer login attempt: {username}")

        try:
            user_obj = CustomUser.objects.get(username=username)
            print(f"User exists: id={user_obj.id}, active={user_obj.is_active}")

            try:
                trainer = Trainer.objects.get(user=user_obj)
                print(f"Trainer profile found: trainer_id={trainer.trainer_id}")
            except Trainer.DoesNotExist:
                return Response({"detail": "No trainer profile found for this username"}, status=status.HTTP_403_FORBIDDEN)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Username not found"}, status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(username=username, password=password)
        print(f"Authentication result: {'Success' if user else 'Failed'}")

        if user is not None:
            trainer = Trainer.objects.get(user=user)
            refresh = RefreshToken.for_user(user)
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user_id': user.id,
                'trainer_id': trainer.trainer_id,
                'name': f"{trainer.first_name} {trainer.last_name}"
            })
        else:
            try:
                if check_password(password, user_obj.password):
                    trainer = Trainer.objects.get(user=user_obj)
                    refresh = RefreshToken.for_user(user_obj)
                    return Response({
                        'token': str(refresh.access_token),
                        'refresh': str(refresh),
                        'user_id': user_obj.id,
                        'trainer_id': trainer.trainer_id,
                        'name': f"{trainer.first_name} {trainer.last_name}"
                    })
                else:
                    return Response({"detail": "Incorrect password"}, status=status.HTTP_401_UNAUTHORIZED)
            except Exception as e:
                return Response({"detail": "Authentication error"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        try:
            trainer = Trainer.objects.get(user=request.user)
            serializer = TrainerSerializer(trainer)
            return Response(serializer.data)
        except Trainer.DoesNotExist:
            return Response({"detail": "No trainer profile found for this user"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

       
        
        

class AuthTestViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='test-auth')
    def test_auth(self, request):
        """Test authentication"""
        return Response({
            "message": "Authentication successful",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
                "role": getattr(request.user, 'role', 'unknown')
            },
            "auth_type": str(request.auth.__class__) if request.auth else None
        })



class CommunityViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='posts')
    def get_community_posts(self, request):
        try:
            posts = Post.objects.all().order_by('-date_created')
            serializer = PostSerializer(posts, many=True)
            print("Successfully serialized posts")
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting posts: {str(e)}")
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=True, methods=['post'], url_path='like')
    def like_community_post(self, request, pk=None):
        try:
            post = Post.objects.get(id=pk)
            user = request.user
            
            if user in post.likes.all():
                return Response({'status': 'already liked'}, status=status.HTTP_400_BAD_REQUEST)
            
            post.likes.add(user)
            post.save()
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error liking post: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='posts/create')
    def create_community_post(self, request):
        member_id = request.data.get('memberID')

        if not member_id:
            return Response({'error': 'memberID is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = Member.objects.get(athlete_id=member_id)
            user = member.user

            data = {
                'title': request.data.get('title'),
                'content': request.data.get('content'),
            }

            serializer = PostSerializer(data=data)
            if serializer.is_valid():
                post = serializer.save(created_by=user)
                Notification.objects.create(
                    message=f"New community post created by {member.first_name} {member.last_name}"
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Member.DoesNotExist:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"Error creating post: {str(e)}")
            print(error_trace)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    

    @action(detail=False, methods=['get'], url_path='announcements')
    def get_community_announcements(self, request):
        try:
            announcements = Announcement.objects.all().order_by('-date_created')
            serializer = AnnouncementSerializer(announcements, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting announcements: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='challenges')
    def get_community_challenges(self, request):
        try:
            challenges = Challenge.objects.all()
            serializer = ChallengeSerializer(challenges, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting challenges: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join_challenge(self, request, pk=None):
        try:
            challenge_id = request.data.get("challengeID")
            member_id = request.data.get("memberID")

            if not challenge_id or not member_id:
                return Response({"error": "Missing challengeID or memberID"}, status=400)

            challenge = get_object_or_404(Challenge, id=challenge_id)
            member = get_object_or_404(Member, id=member_id)

            # Check if already joined
            if ChallengeParticipant.objects.filter(challenge=challenge, member=member).exists():
                return Response({"detail": "Already joined this challenge"}, status=400)

            ChallengeParticipant.objects.create(challenge=challenge, member=member)

            return Response({"detail": "Challenge joined successfully"}, status=201)

        except Exception as e:
            import traceback
            traceback.print_exc()  # Print full traceback to console
            return Response({"error": str(e)}, status=500)

            
        

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-date_created')
    serializer_class = PostSerializer
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'], url_path='like')
    def like_community_post(self, request, pk=None):
        try:
            post = Post.objects.get(id=pk)
            user = request.user  # the user who is liking the post
            
            # Check if the user already liked the post
            if user in post.likes.all():
                return Response({'status': 'already liked'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Add the user to the likes relation
            post.likes.add(user)
            post.save()

            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error liking post: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
        


class PostLikeView(APIView):
    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        # Logic for liking the post (e.g., checking if the user already liked)
        if request.user in post.liked_by.all():
            return Response({'error': 'You already liked this post.'}, status=400)
        post.liked_by.add(request.user)
        return Response({'message': 'Liked the post successfully.'})

        
        
        

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = 'pk'

    def get_queryset(self):
        post_pk = self.kwargs.get('post_pk')
        if post_pk:
            return Comment.objects.filter(post_id=post_pk).order_by('-date_created')
        return Comment.objects.all().order_by('-date_created')

    def perform_create(self, serializer):
        post_pk = self.kwargs.get('post_pk')
        if not post_pk:
            raise NotFound('Post ID is required')
        serializer.save(author=self.request.user, post_id=post_pk)

    # Optional: override update to ensure permissions are checked (but DRF does this by default)
    def update(self, request, *args, **kwargs):
        self.check_object_permissions(request, self.get_object())
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_object_permissions(request, self.get_object())
        return super().destroy(request, *args, **kwargs)


    
    

class SupportViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="tickets")
    def get_tickets(self, request):
        member_id = request.query_params.get("memberID")
        if not member_id:
            return Response({"error": "memberID parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tickets = SupportTicket.objects.filter(member__athlete_id=member_id).order_by("-date_created")
            serializer = SupportTicketSerializer(tickets, many=True)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            print(f"Error getting tickets: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="tickets/create")
    def create_ticket(self, request):
        member_id = request.data.get("memberID")
        if not member_id:
            return Response({"error": "memberID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = Member.objects.get(athlete_id=member_id)  # use athlete_id here if that’s the unique identifier
            data = {
                "type": request.data.get("type", "general"),
                "subject": request.data.get("subject"),
                "message": request.data.get("message"),
            }
            serializer = SupportTicketSerializer(data=data)
            if serializer.is_valid():
                ticket = serializer.save(member=member)  # Make sure member is passed here
                Notification.objects.create(
                    message=f"{member.first_name} {member.last_name} needs support. Click here to view his/her message."
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                print("Serializer errors:", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            print(f"Error creating ticket: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

    @action(detail=False, methods=["get"], url_path="faqs")
    def get_faqs(self, request):
        try:
            categories = FAQCategory.objects.all()
            serializer = FAQCategorySerializer(categories, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting FAQs: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)







class AdminCommunityViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    # Announcements
    @action(detail=False, methods=['get'])
    def announcements(self, request):
        announcements = Announcement.objects.all().order_by('-date_created')
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_announcement(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            announcement = serializer.save(created_by=request.user)
            Notification.objects.create(
                message=f"New admin announcement created: {announcement.title}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='delete_announcement')
    def delete_announcement(self, request, pk=None):
        try:
            announcement = Announcement.objects.get(id=pk)
            announcement.delete()
            Notification.objects.create(
                message=f"Admin deleted announcement ID: {pk}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Announcement.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    # Challenges
    @action(detail=False, methods=['get'])
    def challenges(self, request):
        challenges = Challenge.objects.all().order_by('-date_created')
        serializer = ChallengeSerializer(challenges, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_challenge(self, request):
        serializer = ChallengeSerializer(data=request.data)
        if serializer.is_valid():
            challenge = serializer.save(created_by=request.user)
            Notification.objects.create(
                message=f"New admin challenge created: {challenge.title}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='delete_challenge')
    def delete_challenge(self, request, pk=None):
        try:
            challenge = Challenge.objects.get(id=pk)
            challenge.delete()
            Notification.objects.create(
                message=f"Admin deleted challenge ID: {pk}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Challenge.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    # Community Posts
    @action(detail=False, methods=['get'])
    def community_posts(self, request):
        posts = Post.objects.all().order_by('-date_created')
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='toggle_hide_post')
    def toggle_hide_post(self, request, pk=None):
        try:
            post = Post.objects.get(id=pk)
            post.hidden = not post.hidden
            post.save()
            serializer = PostSerializer(post)
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        
        
        
        
        
        
"""       
    
class CommunityListAPIView(generics.ListAPIView):
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer

class CommunityDetailAPIView(generics.RetrieveAPIView):
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer
    lookup_field = 'id'

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_challenge(request, community_id, challenge_id):
    user = request.user
    challenge = get_object_or_404(Challenge, id=challenge_id, community_id=community_id)
    challenge.participants.add(user)
    challenge.save()
    return Response({'detail': 'Joined challenge successfully'}, status=status.HTTP_200_OK)
        
"""  
        
        
        
        
        
        
  
class AdminSupportViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    # Get all support tickets
    @action(detail=False, methods=['get'])
    def tickets(self, request):
        tickets = SupportTicket.objects.all().order_by('-date_created')
        serializer = SupportTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    # Respond to a support ticket
    @action(detail=True, methods=['post'], url_path='respond')
    def respond(self, request, pk=None):
        try:
            ticket = SupportTicket.objects.get(id=pk)
            response = TicketResponse(
                ticket=ticket,
                message=request.data.get('message', ''),
                responder=request.user
            )
            response.save()
            Notification.objects.create(
                message=f"Admin responded to support ticket ID: {pk}"
            )
            serializer = TicketResponseSerializer(response)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except SupportTicket.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    # Close a support ticket
    @action(detail=True, methods=['patch'], url_path='close')
    def close(self, request, pk=None):
        try:
            ticket = SupportTicket.objects.get(id=pk)
            ticket.status = 'closed'
            ticket.save()
            Notification.objects.create(
                message=f"Admin closed support ticket ID: {pk}"
            )
            serializer = SupportTicketSerializer(ticket)
            return Response(serializer.data)
        except SupportTicket.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    # Get all FAQ categories
    @action(detail=False, methods=['get', 'post'], url_path='faq-categories')
    def faq_categories(self, request):
        if request.method == 'GET':
          categories = FAQCategory.objects.all()
          serializer = FAQCategorySerializer(categories, many=True)
          return Response(serializer.data)

        elif request.method == 'POST':
         serializer = FAQCategorySerializer(data=request.data)
         if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=True, methods=['delete'], url_path='delete-faq')
    def delete_faq(self, request,pk):
        try:
            faq = FAQ.objects.get(id=pk)
            faq.delete()
            Notification.objects.create(
                message=f"Admin deleted FAQ ID: {pk}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except:
         return Response(status=status.HTTP_404_NOT_FOUND)

    # Create new FAQ
    @action(detail=False, methods=['post'], url_path='faqs')
    def create_faq(self, request):
        serializer = FAQSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Create new announcement (admin)
    @action(detail=False, methods=['post'], url_path='announcements')
    def create_announcement(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Get all announcements (authenticated users)
    @action(detail=False, methods=['get'], url_path='announcements', permission_classes=[IsAuthenticated])
    def get_announcements(self, request):
        announcements = Announcement.objects.all().order_by('-date_created')
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    

class NotificationViewSet(viewsets.ViewSet):
    """
    ViewSet for managing notifications.
    """

    # Create a notification (Authenticated users)
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_notification(self, request):
        message = request.data.get('message')
        if not message:
            return Response({"error": "Message field is required."}, status=status.HTTP_400_BAD_REQUEST)
        notification = Notification.objects.create(user=request.user, message=message)

        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # Admin: Get recent notifications (latest 20)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def admin_notifications(self, request):
        print(f"Request user: {request.user}, is_staff: {request.user.is_staff}")
        self.check_and_notify_expired_members()
        notifications = Notification.objects.order_by('-created_at')[:30]
        data = [
            {
                "id": n.id,
                "message": n.message,
                "created_at": n.created_at.isoformat(),
                "is_read": n.is_read,
            }
            for n in notifications
        ]
        return Response({"notifications": data})
     # Delete all notifications (Authenticated users)
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_all(self, request):
        Notification.objects.all().delete()
        return Response({'detail': 'All notifications deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

    # Admin: Mark all notifications as read
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})

    # Internal method to check and notify expired members
    def check_and_notify_expired_members(self):
        today = timezone.now().date()
        with transaction.atomic():
            expired_members = Member.objects.select_for_update().filter(expiry_date__lt=today, notified_expired=False)
            for member in expired_members:
                Notification.objects.create(
                    message=f"Membership expired for: {member.first_name} {member.last_name}"
                )
                member.notified_expired = True
                member.save()







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
        
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "token": str(refresh.access_token),  # Add this for frontend compatibility
            "message": "User created successfully",
        }, status=status.HTTP_201_CREATED)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]  # Change to IsAuthenticated in production
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        try:
            product_name = response.data.get('name', 'Unknown Product')
            Notification.objects.create(
                message=f"Product added successfully: {product_name}"
            )
        except Exception as e:
            print(f"Failed to create product notification: {e}")
        return response



# TrainingViewSet
class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.all()
    serializer_class = TrainingSerializer
    permission_classes = [permissions.AllowAny]  # Change to IsAuthenticated in production
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]


    
class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        today_only = request.query_params.get('today_only') == 'true'

        # Filter attendance by member ID
        if today_only:
            data = Attendance.objects.filter(member_id=pk, date=date.today())
        else:
            data = Attendance.objects.filter(member_id=pk)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)
   
    @action(detail=False, methods=['get'], url_path='history')
    def attendance_history_by_date(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': "Missing 'date' parameter"}, status=400)

        parsed_date = parse_date(date_str)
        if not parsed_date:
            return Response({'error': "Invalid date format. Use YYYY-MM-DD."}, status=400)

        records = Attendance.objects.filter(date=parsed_date)  # ✅ FIXED HERE
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)










def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_endpoint(request):
    return Response({"message": "Test endpoint is working"})



    
def test_view(request):
    """Simple test view to verify routing"""
    return JsonResponse({"status": "success", "message": "Test view is working"})



def debug_urls(request):
    """Display all registered URL patterns in a readable format"""
    resolver = get_resolver()
    url_list = []

    def extract_view_name(callback):
        try:
            if hasattr(callback, 'cls'):
                return callback.cls.__name__
            elif hasattr(callback, '__name__'):
                return callback.__name__
            elif hasattr(callback, '__class__'):
                return callback.__class__.__name__
        except Exception:
            return str(callback)
        return 'UnknownView'

    def collect_urls(patterns, base=''):
        for pattern in patterns:
            if isinstance(pattern, URLPattern):  # Simple URL
                path = f"{base}{pattern.pattern}"
                view_name = extract_view_name(pattern.callback)
                url_list.append({
                    "url": str(path),
                    "view": view_name
                })
            elif isinstance(pattern, URLResolver):  # Nested include
                nested_base = f"{base}{pattern.pattern}"
                collect_urls(pattern.url_patterns, nested_base)

    collect_urls(resolver.url_patterns)


    # Optional: Sort alphabetically by path
    url_list.sort(key=lambda x: x["url"])
    
    return JsonResponse({"urls": url_list}, json_dumps_params={"indent": 2})
    

    


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        purchase = serializer.save()

        product_name = purchase.product.name
        total_price = purchase.total_price

        # Create a sale notification
        Notification.objects.create(
            message=f"{product_name} sold for {total_price:.2f} AFN"
        )
        
        
        
        
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def test_jwt_view(request):
    return Response({
        "user": str(request.user),
        "is_authenticated": request.user.is_authenticated,
        "user_id": request.user.id
    })