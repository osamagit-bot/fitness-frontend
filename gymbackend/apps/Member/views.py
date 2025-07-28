from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from apps.Notifications.services import notification_service
from django.http import JsonResponse
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework.parsers import MultiPartParser,FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from dateutil.relativedelta import relativedelta
import traceback

from apps.Authentication.models import CustomUser

from .models import (
    Member,  Trainer, 
    MembershipPayment,Training
)
from .serializers import (
    MemberSerializer,  TrainerSerializer,TrainingSerializer

)
from django.contrib.auth import get_user_model


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import  Http404


User = get_user_model()













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
        """Delete a member and handle token cleanup"""
        try:
            member = self.get_object()
            user = member.user
            member_name = f"{member.first_name} {member.last_name}"
            
            print(f"🗑️ Deleting member: {member_name} (ID: {member.athlete_id})")
            
            # Enhanced token cleanup
            try:
                if hasattr(member, 'user') and member.user:
                    # Blacklist all outstanding tokens for this user
                    tokens = OutstandingToken.objects.filter(user=member.user)
                    for token in tokens:
                        token.blacklist()
                    print(f"✅ Blacklisted {tokens.count()} tokens for user")
            except Exception as e:
                print(f"⚠️ Token cleanup failed: {e}")
            
            # Delete the member (this will also delete the user due to CASCADE)
            response = super().destroy(request, *args, **kwargs)
            
            # Send notification after successful deletion
            try:
                from apps.Notifications.services import notification_service
                message = f"Member Deleted - {member_name} (ID: {member.athlete_id}) has been removed from the system"
                notification_service.create_notification(message)
                print(f"📧 Member deletion notification sent")
            except Exception as e:
                print(f"❌ Failed to send notification: {e}")
            
            return response
            
        except Exception as e:
            print(f"🚨 Error during member deletion: {str(e)}")
            return Response(
                {"error": f"Failed to delete member: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
            from Community.services import notification_service
            notification_service.membership_renewed(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def register(self, request):
        data = request.data
        email = data.get("email", "").strip().lower()

        if CustomUser.objects.filter(email=email).exists():
            return Response({"error": "Email already exists."}, status=400)

        username = f"{data.get('first_name', '').lower()}{data.get('athlete_id', '')}"

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
        print(f"Authentication result: {'Success' if authenticated_user else 'Failed'}")

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

        # First check if user has a member profile
        member = getattr(user, "member", None)
        print(f"Member attached: {member}")

        if member:
            member.delete_requested = True
            member.save()

            # Member account deletion request notification
            from apps.Notifications.services import notification_service
            notification_service.create_notification(
                f"Member '{user.username}' has requested account deletion.",
                user_id=user.id
            )
            return Response({"detail": "Member account deletion request sent."}, status=status.HTTP_200_OK)

        # Only check admin status if no member profile exists
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
            description=f"Renewal for {new_expiry.strftime('%B %Y')}",
        )

        member.start_date = now
        member.expiry_date = new_expiry
        member.notified_expired = False

        member.save()

        print(f"After save, expiry date is {member.expiry_date}")

        # Membership renewal notification handled by service layer
     
        notification_service.membership_renewed(member)

        return Response({"detail": f"Membership renewed until {new_expiry}", "expiry_date": member.expiry_date})

    def get_queryset(self):
        """Get queryset with debugging"""
        # Get all members without any filtering first
        all_members = Member.objects.all()
        print(f"Total members in DB (no filter): {all_members.count()}")
        
        # Also check users and other models
        from apps.Authentication.models import CustomUser
        all_users = CustomUser.objects.all()
        print(f"Total users in DB: {all_users.count()}")
        
        for user in all_users:
            print(f"User: {user.username}, Role: {user.role}, Active: {user.is_active}")
        
        for member in all_members:
            print(f"Member found: ID={member.athlete_id}, Name={member.first_name} {member.last_name}, Active={member.is_active}, User={member.user_id if hasattr(member, 'user') else 'No user'}")
        
        # Fix: Default to showing all members, only filter if explicitly requested
        show_all = self.request.query_params.get("show_all", "true").lower() == "true"
        queryset = Member.objects.all() if show_all else Member.objects.filter(is_active=True)
        
        print(f"show_all parameter: {show_all}")
        print(f"Final queryset count: {queryset.count()}")
        
        return queryset

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
    parser_classes=[MultiPartParser,FormParser]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'list':
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        try:
            trainers = Trainer.objects.all()
            print(f"Total trainers in DB: {trainers.count()}")
            
            trainers_data = []
            
            for trainer in trainers:
                print(f"Trainer found: ID={trainer.trainer_id}, Name={trainer.first_name} {trainer.last_name}, User={trainer.user_id if hasattr(trainer, 'user') else 'No user'}")
                
                trainer_data = {
                    "id": trainer.id,
                    "trainer_id": trainer.trainer_id,
                    "first_name": trainer.first_name,
                    "last_name": trainer.last_name,
                    "email": trainer.email,
                    "phone": trainer.phone,
                    "monthly_salary": trainer.monthly_salary,
                    "specialization": trainer.specialization,
                    "start_date": trainer.start_date,
                    "image": trainer.image.url if trainer.image else None,
                }
                trainers_data.append(trainer_data)
            
            print(f"Returning {len(trainers_data)} trainers to frontend")
            return Response({"results": trainers_data}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in trainer list: {e}")
            print(traceback.format_exc())
            return Response({"error": f"Failed to list trainers: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            trainer = serializer.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error in trainer creation: {e}")
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
        print(f"Authentication result: {'Success' if user else 'Failed'}")

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

# In your member check-in view
def member_checkin(request, member_id):
    try:
        member = Member.objects.get(id=member_id)
        
        # Your check-in logic here...
        # checkin = CheckIn.objects.create(member=member, ...)
        
        # Send notification
        from apps.Notifications.services import notification_service
        notification_service.member_checked_in(member)
        
        return JsonResponse({'success': True, 'message': 'Check-in successful'})
    except Member.DoesNotExist:
        return JsonResponse({'error': 'Member not found'}, status=404)




class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.all()
    serializer_class = TrainingSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    parser_classes=[MultiPartParser,FormParser]

    def list(self, request, *args, **kwargs):
        """List all members with enhanced debugging"""
        try:
            queryset = self.get_queryset()
            print(f"Total members in queryset: {queryset.count()}")
            
            # Debug each member in queryset
            for training in queryset:
              print(f"Training in queryset: ID={training.id}, Type={training.type}, Trainer={training.trainer.first_name} {training.trainer.last_name}")
            
            serializer = self.get_serializer(queryset, many=True)
            data = serializer.data
            
            print(f"Serialized data count: {len(data)}")
            if data:
                print(f"First member data: {data[0]}")
            
            return Response({
                'results': data,
                'count': len(data)
            })
            
        except Exception as e:
            print(f"Error in member list: {str(e)}")
            return Response(
                {"error": f"Failed to fetch members: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
