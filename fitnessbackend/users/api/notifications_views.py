from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

# Assuming you have a Notification model related to User
from ..models import Notification
from ..serializers import NotificationSerializer

class MemberNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        notifications = Notification.objects.filter(user=user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response({'notifications': serializer.data}, status=status.HTTP_200_OK)
