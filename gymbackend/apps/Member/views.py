from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.decorators import action
from django.db.models import Q
from django.db import models
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
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import  Http404


User = get_user_model()

def get_notification_link(message):
    """Determine navigation link based on notification message"""
    lower = message.lower()
    if "password" in lower or "profile" in lower or "account" in lower:
        return "/member-dashboard/settings"
    if "membership" in lower or "renewed" in lower:
        return "/member-dashboard"
    if "purchase" in lower:
        return "/member-dashboard"
    return "/member-dashboard"

def send_member_notification(member, message):
    """Send real-time notification to member and save to database"""
    try:
        # Save to database
        from apps.Notifications.models import Notification
        notification = Notification.objects.create(
            user=member.user,
            message=message
        )
        
        # Determine navigation link
        link = get_notification_link(message)
        
        # Send real-time notification
        channel_layer = get_channel_layer()
        notification_data = {
            "id": notification.id,
            "message": notification.message,
            "created_at": notification.created_at.isoformat(),
            "is_read": notification.is_read,
            "link": link
        }
        async_to_sync(channel_layer.group_send)(
            f"user_{member.user.id}_notifications",
            {
                "type": "send_notification",
                "notification": notification_data
            }
        )
    except Exception as e:
        print(f"Failed to send notification: {e}")













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
        """Delete a member and handle token cleanup - Revenue is NEVER reduced"""
        try:
            member = self.get_object()
            user = member.user
            member_name = f"{member.first_name} {member.last_name}"
            member_fee = member.monthly_fee
            
            print(f"🗑️ Deleting member: {member_name} (ID: {member.athlete_id}, Fee: {member_fee} AFN)")
            print(f"⚠️ Revenue will NOT be reduced - money already received remains in system")
            
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
            # Revenue tracking is NOT affected - money already received stays in system
            response = super().destroy(request, *args, **kwargs)
            
            # Notification is sent automatically by signal in apps/Notifications/signals.py
            print(f"✅ Member {member_name} (ID: {member.athlete_id}) deleted successfully")
            
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
        else:
            send_member_notification(instance, f"Profile updated successfully for {instance.first_name} {instance.last_name}")
        
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        """Override perform_update to add notifications for profile updates"""
        instance = serializer.save()
        # Send notification for profile updates (not expiry changes)
        if 'expiry_date' not in serializer.validated_data:
            send_member_notification(instance, f"Profile updated successfully for {instance.first_name} {instance.last_name}")

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

            # Revenue is automatically added by post_save signal, no need to add manually here
            from .models import MembershipRevenue
            current_revenue = MembershipRevenue.get_current_month_revenue()
            print(f"✅ Revenue will be updated by signal: (+{member.monthly_fee}) for {member.first_name} {member.last_name}")
            
            # Create payment record AFTER revenue tracking (for audit only)
            MembershipPayment.objects.create(member=member, amount=member.monthly_fee, description="Registration fee")

            # Send welcome notification
            send_member_notification(member, f"Welcome to the gym, {member.first_name}! Your membership is now active.")
            
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
            member = serializer.save()
            send_member_notification(member, f"Profile updated successfully for {member.first_name} {member.last_name}")
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=["post"])
    def change_password(self, request, athlete_id=None):
        print(f"🔒 Password change request for athlete_id: {athlete_id}")
        print(f"🔒 Request data: {request.data}")
        
        member = self.get_object()
        print(f"🔒 Member found: {member.first_name} {member.last_name}")
        
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        
        if not check_password(current_password, member.user.password):
            return Response({"detail": "Current password incorrect."}, status=400)
            
        member.user.set_password(new_password)
        member.user.save()
        print(f"🔒 Password updated successfully")
        
        # Send notification
        print(f"🔒 Sending notification...")
        send_member_notification(member, f"Password changed successfully for {member.first_name} {member.last_name}")
        print(f"🔒 Notification sent")
        
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

            # Send notification to member
            send_member_notification(member, "Account deletion request submitted. Admin will review your request.")
            
            # Admin notification (user_id=None for admin only)
            from apps.Notifications.services import notification_service
            notification_service.create_notification(
                f"Member '{user.username}' has requested account deletion.",
                user_id=None
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

        # ONLY add to persistent revenue tracking for renewal
        from .models import MembershipRevenue
        old_revenue = MembershipRevenue.get_current_month_revenue()
        new_revenue = MembershipRevenue.add_member_revenue(member.monthly_fee, member.athlete_id)
        print(f"✅ Revenue updated: {old_revenue} -> {new_revenue} AFN (+{member.monthly_fee}) for renewal of {member.first_name} {member.last_name}")
        
        # Create payment record AFTER revenue tracking (for audit only)
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

        # Send renewal notification
        send_member_notification(member, f"Membership renewed until {new_expiry.strftime('%B %d, %Y')}")
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
        send_member_notification(member, f"Your account has been activated, {member.first_name}!")
        return Response({"detail": "Member activated successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def fix_revenue_doubling(self, request):
        """Fix revenue doubling by resetting to correct member fee totals"""
        try:
            from .models import MembershipRevenue
            from datetime import datetime
            from decimal import Decimal
            
            current_month = datetime.now().replace(day=1).date()
            
            # Get actual member data
            members = Member.objects.all()
            actual_count = members.count()
            actual_total = sum(float(member.monthly_fee) for member in members)
            
            # Get or create revenue record
            revenue_record, created = MembershipRevenue.objects.get_or_create(
                month=current_month,
                defaults={
                    'total_revenue': Decimal(str(actual_total)),
                    'member_count': actual_count
                }
            )
            
            old_revenue = float(revenue_record.total_revenue)
            
            # Reset to correct values
            revenue_record.total_revenue = Decimal(str(actual_total))
            revenue_record.member_count = actual_count
            revenue_record.save()
            
            print(f"✅ Revenue fixed: {old_revenue} -> {actual_total} AFN")
            
            return Response({
                "detail": "Revenue doubling fixed successfully",
                "old_revenue": old_revenue,
                "new_revenue": actual_total,
                "member_count": actual_count,
                "note": "Revenue now matches sum of current member fees"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": f"Error fixing revenue: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def refresh_revenue(self, request):
        """Refresh and sync membership revenue - ONLY use persistent revenue tracking"""
        try:
            from .models import MembershipRevenue
            from datetime import datetime
            
            # Get current persistent revenue (this is the correct source)
            current_month = datetime.now().replace(day=1).date()
            revenue_record, created = MembershipRevenue.objects.get_or_create(
                month=current_month,
                defaults={
                    'total_revenue': 0,
                    'member_count': 0
                }
            )
            
            # Get current member count for reference
            member_count = Member.objects.count()
            
            print(f"✅ Current persistent revenue: {revenue_record.total_revenue} AFN for {member_count} members")
            
            return Response({
                "detail": "Revenue data retrieved successfully",
                "member_count": member_count,
                "persistent_revenue": float(revenue_record.total_revenue),
                "note": "Revenue only increases when members register/renew, never decreases when deleted"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": f"Error getting revenue: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def check_membership_expiry(self, request):
        """Manually trigger membership expiry check"""
        try:
            from django.core.management import call_command
            from io import StringIO
            
            # Capture command output
            out = StringIO()
            call_command('check_membership_expiry', stdout=out)
            output = out.getvalue()
            
            return Response({
                "detail": "Membership expiry check completed",
                "output": output
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": f"Error checking membership expiry: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def debug_revenue(self, request):
        """Debug endpoint to check revenue calculation"""
        try:
            from .models import MembershipRevenue
            from datetime import datetime
            
            current_month = datetime.now().replace(day=1).date()
            
            # Get persistent revenue
            try:
                revenue_record = MembershipRevenue.objects.get(month=current_month)
                persistent_revenue = float(revenue_record.total_revenue)
                persistent_count = revenue_record.member_count
            except MembershipRevenue.DoesNotExist:
                persistent_revenue = 0
                persistent_count = 0
            
            # Get actual member data
            members = Member.objects.all()
            actual_count = members.count()
            actual_total = sum(float(member.monthly_fee) for member in members)
            
            # Get payment records
            payments = MembershipPayment.objects.filter(
                paid_on__month=current_month.month,
                paid_on__year=current_month.year
            )
            payment_total = sum(float(payment.amount) for payment in payments)
            
            return Response({
                "persistent_revenue": persistent_revenue,
                "persistent_member_count": persistent_count,
                "actual_member_count": actual_count,
                "actual_total_fees": actual_total,
                "payment_records_count": payments.count(),
                "payment_records_total": payment_total,
                "issue_detected": persistent_revenue != actual_total,
                "note": "Persistent revenue should equal actual total fees, not payment records"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def membership_payments(self, request):
        """Get membership revenue using persistent tracking (not payment records)"""
        try:
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            from .models import MembershipRevenue
            from datetime import datetime
            
            # For current month, use persistent revenue
            current_month = datetime.now().replace(day=1).date()
            
            if start_date and end_date:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                
                # Check if requesting current month
                if (start_date_obj.year == current_month.year and 
                    start_date_obj.month == current_month.month):
                    
                    # Use persistent revenue for current month
                    revenue_record, created = MembershipRevenue.objects.get_or_create(
                        month=current_month,
                        defaults={'total_revenue': 0, 'member_count': 0}
                    )
                    total_revenue = revenue_record.total_revenue
                    
                    print(f"✅ Using persistent revenue for current month: {total_revenue} AFN")
                    
                    # Get payment records for display purposes only
                    payments_query = MembershipPayment.objects.filter(
                        paid_on__gte=start_date_obj,
                        paid_on__lte=end_date_obj
                    ).order_by('-paid_on')
                    
                    payment_data = []
                    for payment in payments_query:
                        payment_data.append({
                            'id': payment.id,
                            'member_name': payment.member_name or (payment.member.first_name + ' ' + payment.member.last_name if payment.member else 'Unknown'),
                            'amount': float(payment.amount),
                            'paid_on': payment.paid_on.strftime('%Y-%m-%d'),
                            'description': payment.description
                        })
                    
                    return Response({
                        "payments": payment_data,
                        "total_revenue": float(total_revenue),
                        "count": payments_query.count(),
                        "date_range": {
                            "start_date": start_date,
                            "end_date": end_date
                        },
                        "note": "Revenue from persistent tracking (prevents double counting)"
                    }, status=status.HTTP_200_OK)
                else:
                    # For other months, use payment records
                    payments_query = MembershipPayment.objects.filter(
                        paid_on__gte=start_date_obj,
                        paid_on__lte=end_date_obj
                    ).order_by('-paid_on')
                    
                    total_revenue = payments_query.aggregate(total=models.Sum('amount'))['total'] or 0
                    
                    payment_data = []
                    for payment in payments_query:
                        payment_data.append({
                            'id': payment.id,
                            'member_name': payment.member_name or (payment.member.first_name + ' ' + payment.member.last_name if payment.member else 'Unknown'),
                            'amount': float(payment.amount),
                            'paid_on': payment.paid_on.strftime('%Y-%m-%d'),
                            'description': payment.description
                        })
                    
                    return Response({
                        "payments": payment_data,
                        "total_revenue": float(total_revenue),
                        "count": payments_query.count(),
                        "date_range": {
                            "start_date": start_date,
                            "end_date": end_date
                        }
                    }, status=status.HTTP_200_OK)
            else:
                # Default to current month persistent revenue
                revenue_record, created = MembershipRevenue.objects.get_or_create(
                    month=current_month,
                    defaults={'total_revenue': 0, 'member_count': 0}
                )
                
                return Response({
                    "payments": [],
                    "total_revenue": float(revenue_record.total_revenue),
                    "count": 0,
                    "note": "Current month persistent revenue"
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": f"Error getting membership revenue: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
