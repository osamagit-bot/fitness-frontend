from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer, UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAdminUser
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework import status
from django.contrib.auth.hashers import make_password

from .models import (
    Member, Product, Trainer, Training, CustomUser, Attendance,
    # New models for community and support
    Post, Announcement, Challenge, SupportTicket, FAQ, FAQCategory, TicketResponse
)
from .serializers import (
    MemberSerializer, CustomTokenObtainPairSerializer, ProductSerializer, 
    TrainerSerializer, TrainingSerializer,
    # New serializers for community and support
    PostSerializer, AnnouncementSerializer, ChallengeSerializer,
    SupportTicketSerializer, FAQCategorySerializer, TicketResponseSerializer
)
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.http import JsonResponse, Http404
from django.middleware.csrf import get_token
from django.urls import path
# Add these imports
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
# Define the MyTokenObtainPairSerializer class first

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













@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Add this to allow unauthenticated access
def admin_login(request):
    """Admin login endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"Login attempt for admin: {username}")  # Debug logging
    
    user = authenticate(username=username, password=password)
    
    if user is not None and user.is_staff:
        # Generate JWT token for admin
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.pk,
            'username': user.username,
            'is_admin': True
        })
    else:
        # Authentication failed
        if user is None:
            return Response({'detail': 'Invalid credentials'}, status=401)
        elif not user.is_staff:
            return Response({'detail': 'User is not an admin'}, status=403)
        else:
            return Response({'detail': 'Unknown error'}, status=401)

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


# NEW FUNCTION: Add this to your views.py
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




def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_endpoint(request):
    return Response({"message": "Test endpoint is working"})

# In views.py



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

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def trainer_login(request):
    """Trainer login endpoint with enhanced debugging"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"Trainer login attempt: {username}")
    
    # Check if user exists
    try:
        user_obj = CustomUser.objects.get(username=username)
        print(f"User exists: id={user_obj.id}, active={user_obj.is_active}")
        
        # Check if trainer exists
        try:
            trainer = Trainer.objects.get(user=user_obj)
            print(f"Trainer profile found: trainer_id={trainer.trainer_id}")
        except Trainer.DoesNotExist:
            print("No trainer profile found for this user")
            return Response({"detail": "No trainer profile found for this username"}, 
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
        trainer = Trainer.objects.get(user=user)
        
        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        print(f"Generated token for trainer: {trainer.first_name}")
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'trainer_id': trainer.trainer_id,
            'name': f"{trainer.first_name} {trainer.last_name}"
        })
    else:
        # Try direct password verification as fallback
        try:
            from django.contrib.auth.hashers import check_password
            
            if check_password(password, user_obj.password):
                print("Password matches but authenticate() failed - using fallback")
                
                # Get trainer profile
                trainer = Trainer.objects.get(user=user_obj)
                
                # Generate JWT token manually
                refresh = RefreshToken.for_user(user_obj)
                print(f"Generated token for trainer: {trainer.first_name}")
                
                return Response({
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user_id': user_obj.id,
                    'trainer_id': trainer.trainer_id,
                    'name': f"{trainer.first_name} {trainer.last_name}"
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
def test_auth(request):
    """
    Test authentication endpoint
    """
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

# Add the missing ProductViewSet
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]  # Change to IsAuthenticated in production
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]

# Add the missing TrainingViewSet
class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.all()
    serializer_class = TrainingSerializer
    permission_classes = [permissions.AllowAny]  # Change to IsAuthenticated in production
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]

# Add the missing AttendanceViewSet

    # Add other methods like check_in, check_out, etc.

class TrainerViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.all()
    serializer_class = TrainerSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    
    def list(self, request, *args, **kwargs):
        try:
            # Get all trainers directly from database
            trainers = Trainer.objects.all()
            
            # Manually create the response data
            trainer_data = []
            for trainer in trainers:
                # Create a dictionary with trainer data
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
                }
                
                # Add username and password
                if trainer.user:
                    data['username'] = trainer.user.username
                    # Get raw password from user if available (this will be the hashed version)
                    data['password'] = trainer.user.password
                else:
                    data['username'] = 'N/A'
                    data['password'] = 'N/A'
                
                trainer_data.append(data)
            
            # Return the response
            return Response(trainer_data)
        
        except Exception as e:
            # Log the error
            import traceback
            print(f"Error in trainer list: {e}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Failed to list trainers: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            data = request.data
            
            # Extract user credentials
            username = data.get('username')
            password = data.get('password')
            email = data.get('email', '')
            
            if not username or not password:
                return Response(
                    {"error": "Username and password are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user with this username already exists
            if User.objects.filter(username=username).exists():
                return Response(
                    {"error": f"User with username '{username}' already exists."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the user
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email
            )
            
            # Create the trainer
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
            
            # Create response data
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
                'password': password  # Return the password for admin to see
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log the error for debugging
            import traceback
            print(f"Error in trainer creation: {str(e)}")
            print(traceback.format_exc())
            
            # Return a proper error response
            return Response(
                {"error": f"Failed to create trainer: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        









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

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([permissions.IsAuthenticated])
def register_trainer(request):
    """
    Register a new trainer with authentication credentials
    """
    try:
        # Extract data from request
        data = request.data
        
        # Create trainer using serializer
        serializer = TrainerSerializer(data=data)
        if serializer.is_valid():
            trainer = serializer.save()
            
            # Get the actual username that was created
            actual_username = trainer.user.username
            
            # Use pk which is always available
            trainer_id = trainer.pk
            
            return Response({
                "message": f"Trainer registered successfully: {trainer.first_name} {trainer.last_name}",
                "trainer": {
                    "pk": trainer_id,  # Changed from id to pk
                    "trainer_id": trainer.trainer_id,
                    "first_name": trainer.first_name,
                    "last_name": trainer.last_name
                },
                "auth": {
                    "username": actual_username,
                    "email": trainer.user.email if hasattr(trainer.user, 'email') else "",
                }
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "error": "Invalid trainer data",
                "details": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        print(f"Error registering trainer: {str(e)}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([permissions.IsAuthenticated])
def get_trainer_profile(request):
    """Get the profile of the currently logged-in trainer"""
    try:
        # Find the trainer associated with the current user
        trainer = Trainer.objects.get(user=request.user)
        serializer = TrainerSerializer(trainer)
        return Response(serializer.data)
    except Trainer.DoesNotExist:
        return Response(
            {"detail": "No trainer profile found for this user"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_admin_dashboard_stats(request):
    """Get statistics for the admin dashboard"""
    try:
        # Total members
        total_members = Member.objects.count()
        
        # Members present today
      
        
        # Total trainers
        total_trainers = Trainer.objects.count()
        
        # Monthly revenue
        monthly_revenue = Member.objects.aggregate(Sum('monthly_fee'))['monthly_fee__sum'] or 0
        
        # Today's attendance
        
        
        # Calculate daily revenue - monthly revenue divided by days in month
        now = timezone.now()
        days_in_month = (timezone.datetime(now.year + (now.month == 12), 
                                         ((now.month % 12) + 1), 1) - 
                       timezone.datetime(now.year, now.month, 1)).days
        daily_revenue = round(monthly_revenue / days_in_month, 2) if days_in_month > 0 else 0
        
        return Response({
            'total_members': total_members,
          
            'total_trainers': total_trainers,
            'monthly_revenue': f"{monthly_revenue:.2f} AFN",
            'daily_revenue': f"{daily_revenue:.2f} AFN",
            
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    






    # In your views.py (or create a new view file if needed)

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
    



    # In views.py
# In views.py
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
    





    # In views.py

# Add or update this view
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
        
        # Generate new token since password change invalidates existing tokens
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
    


    # Add this to views.py
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.AllowAny])  # For testing, change to IsAuthenticated later
def update_member_profile(request, member_id):
    """Get or update member profile"""
    try:
        # Try to find the member by different IDs
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
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
    except Exception as e:
        return Response({"detail": str(e)}, status=500)
    




        # In your Django views.py or viewsets
@api_view(['GET', 'PUT'])
def member_training_schedule(request, member_id):
    """
    Get or update a member's training schedule
    """
    try:
        member = Member.objects.get(id=member_id)
    except Member.DoesNotExist:
        return Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Only allow the member to access their own schedule or staff users
    if str(request.user.id) != str(member_id) and not request.user.is_staff:
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get or create training schedule
        schedule, created = TrainingSchedule.objects.get_or_create(member=member)
        return Response({
            'monday': schedule.monday,
            'tuesday': schedule.tuesday,
            'wednesday': schedule.wednesday,
            'thursday': schedule.thursday,
            'friday': schedule.friday,
            'saturday': schedule.saturday,
            'sunday': schedule.sunday
        })
    
    elif request.method == 'PUT':
        # Update training schedule
        schedule, created = TrainingSchedule.objects.get_or_create(member=member)
        schedule.monday = request.data.get('monday', schedule.monday)
        schedule.tuesday = request.data.get('tuesday', schedule.tuesday)
        schedule.wednesday = request.data.get('wednesday', schedule.wednesday)
        schedule.thursday = request.data.get('thursday', schedule.thursday)
        schedule.friday = request.data.get('friday', schedule.friday)
        schedule.saturday = request.data.get('saturday', schedule.saturday)
        schedule.sunday = request.data.get('sunday', schedule.sunday)
        schedule.save()
        
        return Response({
            'monday': schedule.monday,
            'tuesday': schedule.tuesday,
            'wednesday': schedule.wednesday,
            'thursday': schedule.thursday,
            'friday': schedule.friday,
            'saturday': schedule.saturday,
            'sunday': schedule.sunday
        })
    



# In your views.py file
@csrf_exempt
def member_dashboard(request, member_id):
    """Get member dashboard data"""
    try:
        # Try to find the member
        member = Member.objects.get(athlete_id=member_id)
        
        # Get recent attendance (if Attendance model exists)
        recent_attendance = []
        try:
            attendance_records = Attendance.objects.filter(
                member=member
            ).order_by('-date')[:5]  # Get 5 most recent records
            
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
            # Continue even if attendance fetching fails
        
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
    







# In your views.py
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
    
def test_view(request):
    """Simple test view to verify routing"""
    return JsonResponse({"status": "success", "message": "Test view is working"})


def debug_urls(request):
    """Display all registered URL patterns"""
    from django.urls import get_resolver
    resolver = get_resolver()
    url_patterns = []
    
    def collect_urls(patterns, base=''):
        for pattern in patterns:
            if hasattr(pattern, 'pattern'):
                # This is a URLPattern
                if hasattr(pattern, 'callback') and pattern.callback:
                    callback_name = pattern.callback.__name__ if hasattr(pattern.callback, '__name__') else str(pattern.callback)
                    url_patterns.append(f"{base}{pattern.pattern} -> {callback_name}")
            
            if hasattr(pattern, 'url_patterns'):
                # This is a URLResolver with nested patterns
                if hasattr(pattern, 'pattern'):
                    new_base = f"{base}{pattern.pattern}"
                    collect_urls(pattern.url_patterns, new_base)
    
    collect_urls(resolver.url_patterns)
    return JsonResponse({"urls": url_patterns})








# users/views.py

from django.shortcuts import get_object_or_404

# ----- Community API Endpoints -----
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_community_posts(request):
    try:
        posts = Post.objects.all().order_by('-date_created')
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error getting posts: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_community_post(request):
    member_id = request.data.get('memberID')
    
    if not member_id:
        return Response({'error': 'memberID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Change from id to athlete_id based on the error message
        member = Member.objects.get(athlete_id=member_id)
        user = member.user
        
        data = {
            'title': request.data.get('title'),
            'content': request.data.get('content'),
        }
        
        serializer = PostSerializer(data=data)
        if serializer.is_valid():
            post = serializer.save(author=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Member.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating post: {str(e)}")
        print(error_trace)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def like_community_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
        post.likes += 1
        post.save()
        return Response({'status': 'success'}, status=status.HTTP_200_OK)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error liking post: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_community_announcements(request):
    try:
        announcements = Announcement.objects.all().order_by('-date_created')
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error getting announcements: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_community_challenges(request):
    try:
        challenges = Challenge.objects.all()
        serializer = ChallengeSerializer(challenges, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error getting challenges: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def join_community_challenge(request, challenge_id):
    try:
        challenge = Challenge.objects.get(id=challenge_id)
        member_id = request.data.get('memberID')
        # Change from id to athlete_id
        member = Member.objects.get(athlete_id=member_id)
        user = member.user
        challenge.participants.add(user)
        return Response({'status': 'success'}, status=status.HTTP_200_OK)
    except Challenge.DoesNotExist:
        return Response({'error': 'Challenge not found'}, status=status.HTTP_404_NOT_FOUND)
    except Member.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error joining challenge: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ----- Support API Endpoints -----
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_support_tickets(request):
    member_id = request.query_params.get('memberID')
    if not member_id:
        return Response({'error': 'memberID parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Change from member_id to athlete_id
        tickets = SupportTicket.objects.filter(member__athlete_id=member_id).order_by('-date_created')
        serializer = SupportTicketSerializer(tickets, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error getting tickets: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_support_ticket(request):
    member_id = request.data.get('memberID')
    if not member_id:
        return Response({'error': 'memberID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Change from id to athlete_id
        member = Member.objects.get(athlete_id=member_id)
        data = {
            'type': request.data.get('type', 'general'),
            'subject': request.data.get('subject'),
            'message': request.data.get('message'),
            'member': member.athlete_id  # Adjust this if your serializer expects something different
        }
        serializer = SupportTicketSerializer(data=data)
        if serializer.is_valid():
            ticket = serializer.save(member=member)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Member.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error creating ticket: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_support_faqs(request):
    try:
        categories = FAQCategory.objects.all()
        serializer = FAQCategorySerializer(categories, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error getting FAQs: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    







    # In your views.py file

# Admin Community Management Endpoints
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_admin_announcements(request):
    """Get all announcements for admin management"""
    announcements = Announcement.objects.all().order_by('-date_created')
    serializer = AnnouncementSerializer(announcements, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_admin_announcement(request):
    """Create a new announcement from admin"""
    serializer = AnnouncementSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_admin_announcement(request, announcement_id):
    """Delete an announcement"""
    try:
        announcement = Announcement.objects.get(id=announcement_id)
        announcement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Announcement.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_admin_challenges(request):
    """Get all challenges for admin management"""
    challenges = Challenge.objects.all().order_by('-date_created')
    serializer = ChallengeSerializer(challenges, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_admin_challenge(request):
    """Create a new challenge from admin"""
    serializer = ChallengeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_admin_challenge(request, challenge_id):
    """Delete a challenge"""
    try:
        challenge = Challenge.objects.get(id=challenge_id)
        challenge.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Challenge.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_admin_community_posts(request):
    """Get all community posts for admin moderation"""
    posts = Post.objects.all().order_by('-date_created')
    serializer = PostSerializer(posts, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def hide_admin_community_post(request, post_id):
    """Hide/unhide a community post"""
    try:
        post = Post.objects.get(id=post_id)
        post.hidden = not post.hidden
        post.save()
        serializer = PostSerializer(post)
        return Response(serializer.data)
    except Post.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    




    # Admin Support Management Endpoints
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_admin_support_tickets(request):
    """Get all support tickets for admin management"""
    tickets = SupportTicket.objects.all().order_by('-date_created')
    serializer = SupportTicketSerializer(tickets, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def respond_to_support_ticket(request, ticket_id):
    """Admin responds to a support ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        response = TicketResponse(
            ticket=ticket,
            message=request.data.get('message', ''),
            responder=request.user
        )
        response.save()
        serializer = TicketResponseSerializer(response)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except SupportTicket.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['PATCH'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def close_support_ticket(request, ticket_id):
    """Close a support ticket"""
    try:
        ticket = SupportTicket.objects.get(id=ticket_id)
        ticket.status = 'closed'
        ticket.save()
        serializer = SupportTicketSerializer(ticket)
        return Response(serializer.data)
    except SupportTicket.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_admin_faq_categories(request):
    """Get all FAQ categories for admin management"""
    categories = FAQCategory.objects.all()
    serializer = FAQCategorySerializer(categories, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_admin_faq_category(request):
    """Create a new FAQ category"""
    serializer = FAQCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_admin_faq(request):
    """Create a new FAQ"""
    serializer = FAQSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_announcement(request):
    """Create a new announcement from admin"""
    serializer = AnnouncementSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_announcements(request):
    """Get all announcements"""
    announcements = Announcement.objects.all().order_by('-date_created')
    serializer = AnnouncementSerializer(announcements, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_admin_announcement(request):
    """Create a new announcement from admin"""
    # Get the data from the request
    data = request.data
    
    # Create a serializer with the data
    serializer = AnnouncementSerializer(data=data)
    
    if serializer.is_valid():
        # Save with the current user as created_by
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)






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