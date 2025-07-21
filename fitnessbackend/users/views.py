from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from datetime import date
import traceback
from django.shortcuts import render

from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from dateutil.relativedelta import relativedelta
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from django.utils.dateparse import parse_date

# Import your models and serializers
from .models import (
    Member, Product, Trainer, Training, Comment, CustomUser, Attendance, Notification,
    Post, Announcement, Challenge, SupportTicket, FAQ, FAQCategory, TicketResponse, Purchase, MembershipPayment, ChallengeParticipant
)
from .serializers import (
    MemberSerializer, ProductSerializer, TrainerSerializer, TrainingSerializer, PurchaseSerializer,
    AttendanceSerializer, PostSerializer, AnnouncementSerializer, CommentSerializer, ChallengeSerializer,
    FAQSerializer, SupportTicketSerializer, FAQCategorySerializer, TicketResponseSerializer, UserSerializer, RegisterSerializer, NotificationSerializer
)

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import JsonResponse, Http404, HttpResponse
from django.middleware.csrf import get_token
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
from django.views.decorators.http import require_GET

User = get_user_model()

# Assuming you have a permissions.py with IsOwnerOrReadOnly
# permissions.py
from rest_framework import permissions

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

        user = authenticate(username=username, password=password)

        if user is not None and user.is_staff:
            refresh = RefreshToken.for_user(user)
            return Response({
                "access_token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.pk,
                "username": user.username,
                "is_admin": True,
            })
        elif user is None:
            return Response({"detail": "Invalid credentials"}, status=401)
        else:
            return Response({"detail": "User is not an admin"}, status=403)

    @action(detail=False, methods=["get", "post"], url_path="maintenance-mode")
    def maintenance_mode(self, request):
        """Handle maintenance mode toggle"""
        if not request.user.is_staff:
            return Response({"detail": "Admin access required"}, status=403)
        
        if request.method == "GET":
            # Get current maintenance mode status
            from django.conf import settings
            import os
            
            # Check if maintenance mode file exists
            maintenance_file = os.path.join(settings.BASE_DIR, '.maintenance_mode')
            is_enabled = os.path.exists(maintenance_file)
            
            return Response({"enabled": is_enabled})
        
        elif request.method == "POST":
            # Toggle maintenance mode
            from django.conf import settings
            import os
            
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


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    lookup_field = "athlete_id"
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
            user = instance.user

            self.perform_destroy(instance)

            if user and CustomUser.objects.filter(id=user.id).exists():
                user.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        try:
            user = instance.user
            instance.delete()

            if user and CustomUser.objects.filter(id=user.id).exists():
                user.delete()

        except Exception as e:
            print(f"Error during member deletion: {e}")
            raise e

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
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
                is_read=False,
            ).delete()
            # Membership renewal notification handled by service layer
            from .services import notification_service
            notification_service.membership_renewed(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def register(self, request):
        data = request.data
        email = data.get("email", "").strip().lower()

        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": "Email already exists."}, status=400)

        username = f"{data.get("first_name", "").lower()}{data.get("athlete_id", "")}"

        if CustomUser.objects.filter(username=username).exists():
            return Response({"error": "Username already taken."}, status=400)

        user = CustomUser.objects.create_user(username=username, email=email, password=data.get("password"))
        user.role = "member"
        user.save()

        member_data = data.copy()
        member_data["user"] = user.id
        member_data["email"] = email
        serializer = self.get_serializer(data=member_data)

        if serializer.is_valid():
            member = serializer.save()

            MembershipPayment.objects.create(member=member, amount=member.monthly_fee, description="Registration fee")

            # Member registration notification handled automatically by signals
            return Response(
                {
                    "message": "Member registered successfully",
                    "member": serializer.data,
                    "auth": {"username": user.username, "email": user.email},
                },
                status=201,
            )
        else:
            user.delete()
            return Response({"error": serializer.errors}, status=400)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def login(self, request):
        login_input = request.data.get("username")
        password = request.data.get("password")

        print(f"Login attempt with username/email: {login_input}")

        try:
            user = CustomUser.objects.filter(
                Q(username=login_input) | Q(email=login_input),
                role=CustomUser.Role.MEMBER
            ).first()

            if not user:
                print("User not found or not a member")
                return Response({"error": "User not found or not a member"}, status=404)

            member = Member.objects.get(user=user)

        except (CustomUser.DoesNotExist, Member.DoesNotExist) as e:
            print(f"Exception during login: {e}")
            return Response({"detail": "Invalid credentials"}, status=401)

        authenticated_user = authenticate(username=user.email, password=password)
        print(f"Authentication result: {"Success" if authenticated_user else "Failed"}")

        if authenticated_user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "member_id": member.athlete_id,
                "athlete_id": member.athlete_id,
                "name": f"{member.first_name} {member.last_name}",
                "username": user.username,
            })
        elif check_password(password, user.password):
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "member_id": member.athlete_id,
                "athlete_id": member.athlete_id,
                "name": f"{member.first_name} {member.last_name}",
                "username": user.username,
            })
        else:
            print("Incorrect password")
            return Response({"detail": "Incorrect password"}, status=401)

    @action(detail=True, methods=["get"])
    def profile(self, request, pk=None):
        member = self.get_object()
        serializer = self.get_serializer(member)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        member = self.get_object()
        today = timezone.now().date()

        days_remaining = max(0, (member.expiry_date - today).days if member.expiry_date else 0)

        due = float(member.monthly_fee) if member.expiry_date and member.expiry_date < today else 0.0

        status = "Active" if member.membership_status else "Inactive"

        return Response({
            "name": f"{member.first_name} {member.last_name}",
            "days_remaining": days_remaining,
            "next_payment_date": member.next_payment_date.strftime("%B %d, %Y")
            if member.next_payment_date
            else "No payment due",
            "status": status,
            "due": due,
            "upcoming_sessions": [],
        })

    @action(detail=True, methods=["put", "patch"])
    def update_profile(self, request, pk=None):
        member = self.get_object()
        serializer = self.get_serializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Member profile update notification handled automatically by signals
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=["post"])
    def change_password(self, request, athlete_id=None):
        member = self.get_object()
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not check_password(current_password, member.user.password):
            return Response({"detail": "Current password incorrect."}, status=400)
        member.user.set_password(new_password)
        member.user.save()
        refresh = RefreshToken.for_user(member.user)
        return Response({"message": "Password changed", "token": str(refresh.access_token), "refresh": str(refresh)})

    @action(detail=False, methods=["post"])
    def reset_password(self, request):
        member_id = request.data.get("member_id")
        new_password = request.data.get("new_password")
        try:
            member = Member.objects.get(athlete_id=member_id)
            member.user.password = make_password(new_password)
            member.user.save()
            return Response({"detail": "Password reset successful"})
        except Member.DoesNotExist:
            return Response({"detail": "Member not found"}, status=404)

    @action(detail=False, methods=["get"])
    def all_members(self, request):
        members = Member.objects.all()
        data = []
        for member in members:
            data.append({
                "id": member.pk,
                "athlete_id": member.athlete_id,
                "name": f"{member.first_name} {member.last_name}",
                "username": member.user.username if member.user else "",
                "email": member.user.email if member.user else "",
            })
        return Response({"members": data})

    @action(detail=False, methods=["get"])
    def get_member_pk(self, request):
        try:
            return Response({"member_pk": request.user.member.pk})
        except Member.DoesNotExist:
            return Response({"error": "No member profile found."}, status=404)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def request_delete(self, request):
        user = request.user
        print(
            f"Request user: email={user.email}, role={user.role}, id={user.id}, is_staff={user.is_staff}, is_superuser={user.is_superuser}"
        )

        member = getattr(user, "member", None)
        print(f"Member attached: {member}")

        if member:
            member.delete_requested = True
            member.save()

            # Member account deletion request notification
            from .services import notification_service
            notification_service.create_notification(
                f"Member '{user.username}' has requested account deletion.",
                user_id=user.id
            )
            return Response({"detail": "Member account deletion request sent."}, status=status.HTTP_200_OK)

        if user.is_staff or user.is_superuser:
            return Response({"detail": "Admins cannot request account deletion here."}, status=status.HTTP_403_FORBIDDEN)

        return Response({"detail": "User profile type not supported for deletion."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def payments_summary(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_payments = MembershipPayment.objects.filter(paid_on__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0

        return Response({"monthly_payments": float(monthly_payments)})

    @action(detail=True, methods=["post"])
    def renew(self, request, athlete_id=None):
        member = self.get_object()
        now = timezone.now().date()

        base_date = member.expiry_date if member.expiry_date and member.expiry_date > now else now
        new_expiry = base_date + relativedelta(months=1)

        print(f"Renewing member {member.athlete_id}: old expiry {member.expiry_date}, new expiry {new_expiry}")

        MembershipPayment.objects.create(
            member=member,
            member_name=f"{member.first_name} {member.last_name}",
            amount=member.monthly_fee,
            description=f"Renewal for {new_expiry.strftime("%B %Y")}",
        )

        member.start_date = now
        member.expiry_date = new_expiry
        member.notified_expired = False

        member.save()

        print(f"After save, expiry date is {member.expiry_date}")

        # Membership renewal notification handled by service layer
        from .services import notification_service
        notification_service.membership_renewed(member)

        return Response({"detail": f"Membership renewed until {new_expiry}", "expiry_date": member.expiry_date})

    def get_queryset(self):
        show_all = self.request.query_params.get("show_all", "false").lower() == "true"
        return Member.objects.all() if show_all else Member.objects.filter(is_active=True)

    def delete(self, *args, **kwargs):
        self.is_active = False
        self.save()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def activate(self, request, athlete_id=None):
        member = self.get_object()
        if member.is_active:
            return Response({"detail": "Member is already active."}, status=status.HTTP_400_BAD_REQUEST)
        member.is_active = True
        member.save()
        return Response({"detail": "Member activated successfully."}, status=status.HTTP_200_OK)


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
                    "id": trainer.id,
                    "trainer_id": trainer.trainer_id,
                    "first_name": trainer.first_name,
                    "last_name": trainer.last_name,
                    "email": trainer.email,
                    "phone": trainer.phone,
                    "monthly_salary": str(trainer.monthly_salary),
                    "specialization": trainer.specialization,
                    "start_date": str(trainer.start_date),
                    "user": trainer.user.id if trainer.user else None,
                    "username": trainer.user.username if trainer.user else "N/A",
                    "password": trainer.user.password if trainer.user else "N/A",
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
            username = data.get("username")
            password = data.get("password")
            email = data.get("email", "")

            if not username or not password:
                return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username=username).exists():
                return Response({"error": f"User with username \'{username}\' already exists."}, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create_user(username=username, password=password, email=email)

            trainer = Trainer.objects.create(
                user=user,
                trainer_id=data.get("trainer_id"),
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                email=email,
                phone=data.get("phone"),
                monthly_salary=data.get("monthly_salary"),
                specialization=data.get("specialization"),
                start_date=data.get("start_date"),
            )

            # Trainer registration notification handled automatically by signals

            response_data = {
                "id": trainer.id,
                "trainer_id": trainer.trainer_id,
                "first_name": trainer.first_name,
                "last_name": trainer.last_name,
                "email": trainer.email,
                "phone": trainer.phone,
                "monthly_salary": str(trainer.monthly_salary),
                "specialization": trainer.specialization,
                "start_date": str(trainer.start_date),
                "user": user.id,
                "username": username,
                "password": password,
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback

            print(f"Error in trainer creation: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Failed to create trainer: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def login(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
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
        print(f"Authentication result: {"Success" if user else "Failed"}")

        if user is not None:
            trainer = Trainer.objects.get(user=user)
            refresh = RefreshToken.for_user(user)
            return Response({
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user_id": user.id,
                "trainer_id": trainer.trainer_id,
                "name": f"{trainer.first_name} {trainer.last_name}",
            })
        else:
            try:
                if check_password(password, user_obj.password):
                    trainer = Trainer.objects.get(user=user_obj)
                    refresh = RefreshToken.for_user(user_obj)
                    return Response({
                        "token": str(refresh.access_token),
                        "refresh": str(refresh),
                        "user_id": user_obj.id,
                        "trainer_id": trainer.trainer_id,
                        "name": f"{trainer.first_name} {trainer.last_name}",
                    })
                else:
                    return Response({"detail": "Incorrect password"}, status=status.HTTP_401_UNAUTHORIZED)
            except Exception as e:
                return Response({"detail": "Authentication error"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=["get"])
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


class CommunityViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="posts")
    def get_community_posts(self, request):
        try:
            posts = Post.objects.all().order_by("-date_created")
            serializer = PostSerializer(posts, many=True)
            print("Successfully serialized posts")
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting posts: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

   

    @action(detail=False, methods=["post"], url_path="posts/create")
    def create_community_post(self, request):
        member_id = request.data.get("memberID")

        if not member_id:
            return Response({"error": "memberID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = Member.objects.get(athlete_id=member_id)
            user = member.user

            data = {
                "title": request.data.get("title"),
                "content": request.data.get("content"),
            }

            serializer = PostSerializer(data=data)
            if serializer.is_valid():
                post = serializer.save(created_by=user)
                # Community post creation notification handled automatically by signals
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"Error creating post: {str(e)}")
            print(error_trace)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="announcements")
    def get_community_announcements(self, request):
        try:
            announcements = Announcement.objects.all().order_by("-date_created")
            serializer = AnnouncementSerializer(announcements, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting announcements: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="challenges")
    def get_community_challenges(self, request):
        try:
            challenges = Challenge.objects.all()
            serializer = ChallengeSerializer(challenges, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error getting challenges: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join_challenge(self, request, pk=None):
        try:
            challenge_id = request.data.get("challengeID")
            member_id = request.data.get("memberID")

            if not challenge_id or not member_id:
                return Response({"error": "Missing challengeID or memberID"}, status=400)

            challenge = get_object_or_404(Challenge, id=challenge_id)
            member = get_object_or_404(Member, athlete_id=member_id)

            if ChallengeParticipant.objects.filter(challenge=challenge, member=member).exists():
                return Response({"detail": "Already joined this challenge"}, status=400)

            ChallengeParticipant.objects.create(challenge=challenge, member=member)

            return Response({"detail": "Challenge joined successfully"}, status=201)

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

    @classmethod
    def as_community_posts_view(cls):
        return cls.as_view({
            'get': 'get_community_posts',
            'post': 'create_community_post' # If you want to allow post creation here
        })


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by("-date_created")
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        post = self.get_object()
        if post.created_by != request.user:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        if post.created_by != request.user:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
    @action(detail=True, methods=["post"], url_path="like", permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user

        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True

        return Response({
            "liked": liked,
            "likes_count": post.likes.count()
        }, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        # This will be used by the nested router for /community/posts/{post_pk}/comments/
        post_pk = self.kwargs.get("post_pk")
        if post_pk:
            return Comment.objects.filter(post_id=post_pk).order_by("-date_created")
        # This will be used by custom paths if no post_pk is provided (e.g., for direct comment edit/delete)
        return Comment.objects.all().order_by("-date_created")

    def perform_create(self, serializer):
        # For nested comments, post_pk will be available
        post_pk = self.kwargs.get("post_pk")
        post = get_object_or_404(Post, pk=post_pk) if post_pk else None
        
        # Ensure author is set to the requesting user
        serializer.save(author=self.request.user, post=post)

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user:
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)
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
            member = Member.objects.get(athlete_id=member_id)
            data = {
                "type": request.data.get("type", "general"),
                "subject": request.data.get("subject"),
                "message": request.data.get("message"),
            }
            serializer = SupportTicketSerializer(data=data)
            if serializer.is_valid():
                ticket = serializer.save(member=member)
                # Support ticket creation notification
                from .services import notification_service
                notification_service.create_notification(
                    f"New support ticket created by {member.first_name} {member.last_name}"
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

    @action(detail=False, methods=["get"])
    def announcements(self, request):
        announcements = Announcement.objects.all().order_by("-date_created")
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def create_announcement(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            announcement = serializer.save(created_by=request.user)
            # Announcement creation notification handled automatically by signals
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="delete_announcement")
    def delete_announcement(self, request, pk=None):
        try:
            announcement = Announcement.objects.get(id=pk)
            announcement.delete()
            # Announcement deletion notification handled automatically by signals
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Announcement.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"])
    def challenges(self, request):
        challenges = Challenge.objects.all().order_by("-date_created")
        serializer = ChallengeSerializer(challenges, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def create_challenge(self, request):
        serializer = ChallengeSerializer(data=request.data)
        if serializer.is_valid():
            challenge = serializer.save(created_by=request.user)
            # Challenge creation notification handled automatically by signals
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="delete_challenge")
    def delete_challenge(self, request, pk=None):
        try:
            challenge = Challenge.objects.get(id=pk)
            challenge.delete()
            # Challenge deletion notification handled automatically by signals
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Challenge.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"])
    def community_posts(self, request):
        posts = Post.objects.all().order_by("-date_created")
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="toggle_hide_post")
    def toggle_hide_post(self, request, pk=None):
        try:
            post = Post.objects.get(id=pk)
            post.hidden = not post.hidden
            post.save()
            serializer = PostSerializer(post)
            return Response(serializer.data)
        except Post.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


class AdminSupportViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def tickets(self, request):
        tickets = SupportTicket.objects.all().order_by("-date_created")
        serializer = SupportTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond(self, request, pk=None):
        try:
            ticket = SupportTicket.objects.get(id=pk)
            response = TicketResponse(ticket=ticket, message=request.data.get("message", ""), responder=request.user)
            response.save()
            # Support ticket response notification handled by service layer
            from .services import notification_service
            notification_service.support_ticket_responded(pk)
            serializer = TicketResponseSerializer(response)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except SupportTicket.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["patch"], url_path="close")
    def close(self, request, pk=None):
        try:
            ticket = SupportTicket.objects.get(id=pk)
            ticket.status = "closed"
            ticket.save()
            # Support ticket close notification handled by service layer
            from .services import notification_service
            notification_service.support_ticket_closed(pk)
            serializer = SupportTicketSerializer(ticket)
            return Response(serializer.data)
        except SupportTicket.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get", "post"], url_path="faq-categories")
    def faq_categories(self, request):
        if request.method == "GET":
            categories = FAQCategory.objects.all()
            serializer = FAQCategorySerializer(categories, many=True)
            return Response(serializer.data)

        elif request.method == "POST":
            serializer = FAQCategorySerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path="delete-faq")
    def delete_faq(self, request, pk):
        try:
            faq = FAQ.objects.get(id=pk)
            faq.delete()
            # FAQ deletion notification handled by service layer
            from .services import notification_service
            notification_service.faq_deleted(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except:
            return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"], url_path="faqs")
    def create_faq(self, request):
        serializer = FAQSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="announcements")
    def create_announcement(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="announcements", permission_classes=[IsAuthenticated])
    def get_announcements(self, request):
        announcements = Announcement.objects.all().order_by("-date_created")
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def create_notification(self, request):
        message = request.data.get("message")
        if not message:
            return Response({"error": "Message field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Manual notification creation using service layer
        from .services import notification_service
        notification = notification_service.create_notification(message, user_id=request.user.id)

        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def admin_notifications(self, request):
        print(f"Request user: {request.user}, is_staff: {request.user.is_staff}")
        self.check_and_notify_expired_members()
        notifications = Notification.objects.order_by("-created_at")[:30]
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

    @action(detail=False, methods=["delete"], permission_classes=[IsAuthenticated])
    def delete_all(self, request):
        Notification.objects.all().delete()
        return Response({"detail": "All notifications deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({"status": "all marked as read"})

    def check_and_notify_expired_members(self):
        today = timezone.now().date()
        with transaction.atomic():
            expired_members = Member.objects.select_for_update().filter(expiry_date__lt=today, notified_expired=False)
            for member in expired_members:
                # Membership expiry notification handled by service layer
                from .services import notification_service
                notification_service.create_notification(
                    f"Membership expired for: {member.first_name} {member.last_name}"
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


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        try:
            product_name = response.data.get("name", "Unknown Product")
            # Product creation notification handled by service layer
            from .services import notification_service
            notification_service.create_notification(f"Product added successfully: {product_name}")
        except Exception as e:
            print(f"Failed to create product notification: {e}")
        return response


class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.all()
    serializer_class = TrainingSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        today_only = request.query_params.get("today_only") == "true"

        if today_only:
            data = Attendance.objects.filter(member_id=pk, date=date.today())
        else:
            data = Attendance.objects.filter(member_id=pk)

        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="history")
    def attendance_history_by_date(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"error": "Missing 'date' parameter"}, status=400)

        parsed_date = parse_date(date_str)
        if not parsed_date:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        records = Attendance.objects.filter(date=parsed_date)
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)


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


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        purchase = serializer.save()

        product_name = purchase.product.name
        total_price = purchase.total_price

        # Product purchase notification handled by service layer
        from .services import notification_service
        notification_service.create_notification(f"{product_name} sold for {total_price:.2f} AFN")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([JWTAuthentication])
def test_jwt_view(request):
    return Response({"user": str(request.user), "is_authenticated": request.user.is_authenticated, "user_id": request.user.id})


# Helper for CommunityViewSet.as_community_posts_view
# This is a simple way to expose a method from a ViewSet as a standalone view
# You might need to adjust this based on your exact Django REST Framework version and setup
# For example, if you have a custom BaseViewSet or a different way of exposing actions
# You can also just define a regular APIView for this if it's simpler.
# from rest_framework.views import APIView
# class CommunityPostsAPIView(APIView):
#     permission_classes = [IsAuthenticated]
#     authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
#     def get(self, request, *args, **kwargs):
#         return CommunityViewSet().get_community_posts(request)
#     def post(self, request, *args, **kwargs):
#         return CommunityViewSet().create_community_post(request)

# For simplicity, assuming CommunityViewSet has a static method or a class method
# that can be called to get the view function. If not, the above APIView approach is better.
# Or, you can just use router.register(r'community/posts', PostViewSet, basename='posts')
# and let PostViewSet handle all /community/posts/ actions, which is more standard.

# If you want to keep CommunityViewSet for other actions and PostViewSet for CRUD:
# You would register PostViewSet under a different base, e.g., router.register(r'posts', PostViewSet, basename='posts')
# And then manually define the /community/posts/ endpoint to use PostViewSet.as_view({'get': 'list', 'post': 'create'})

# For now, I'll assume CommunityViewSet.as_community_posts_view is a valid way to get the view.
# If it's not, you'll need to replace it with a proper view function or APIView.

# Example of how to define as_community_posts_view if it's not a class method:
# from rest_framework.decorators import api_view
# @api_view(['GET', 'POST'])
# @permission_classes([IsAuthenticated])
# @authentication_classes([JWTAuthentication, TokenAuthentication, SessionAuthentication])
# def community_posts_list_create(request):
#     if request.method == 'GET':
#         return CommunityViewSet().get_community_posts(request)
#     elif request.method == 'POST':
#         return CommunityViewSet().create_community_post(request)

# For the purpose of this fix, I'm assuming CommunityViewSet.as_community_posts_view() exists and works as intended.
# If it doesn't, you'll need to replace it with a proper view function or APIView.

def Home(request):
    # Since you're using React frontend, redirect to the frontend
    return render(request,"home.html")

