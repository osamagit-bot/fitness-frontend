from django.shortcuts import render
from .models import Post, Comment, Announcement, Challenge, ChallengeParticipant, SupportTicket,FAQ,FAQCategory,TicketResponse
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .serializers import PostSerializer, CommentSerializer, AnnouncementSerializer, ChallengeSerializer, SupportTicketSerializer, TicketResponseSerializer,FAQCategorySerializer,FAQSerializer,TicketResponseSerializer,FAQ

from rest_framework.permissions import IsAdminUser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from apps.Member.models import Member
import traceback
from apps.Authentication.permissions import IsOwnerOrReadOnly




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
            # Add explicit ordering
            announcements = Announcement.objects.all().order_by("-date_created", "-id")
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
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Set the created_by field to the current user when creating a post"""
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        post = self.get_object()
        # Check ownership using the correct field name
        if post.created_by != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        post = self.get_object()
        # Check ownership using the correct field name
        if post.created_by != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
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
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs.get('post_pk')
        return Comment.objects.filter(post_id=post_id)

    def perform_create(self, serializer):
        post_id = self.kwargs.get('post_pk')
        post = Post.objects.get(id=post_id)
        serializer.save(author=self.request.user, post=post)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        # Comment model uses 'author' field
        if comment.author != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        # Comment model uses 'author' field
        if comment.author != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)


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
        announcements = Announcement.objects.all().order_by("-date_created", "-id")
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
        tickets = SupportTicket.objects.all().order_by("-date_created", "-id")
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

