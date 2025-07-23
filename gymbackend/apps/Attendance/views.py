from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from dateutil.parser import parse as parse_date
from .models import Attendance
from .serializers import AttendanceSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """Get attendance history for a specific member"""
        today_only = request.query_params.get("today_only") == "true"
        
        try:
            # Verify the member exists
            from apps.Member.models import Member
            member = Member.objects.get(athlete_id=pk)
            
            # SECURITY: Check if user is requesting their own data or is admin
            if not (request.user.is_staff or 
                    request.user.is_superuser or 
                    (hasattr(request.user, 'member') and request.user.member == member)):
                return Response({"error": "Permission denied"}, status=403)
            
            if today_only:
                data = Attendance.objects.filter(member=member, date=date.today())
            else:
                data = Attendance.objects.filter(member=member)

            serializer = self.get_serializer(data, many=True)
            return Response(serializer.data)
            
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

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
