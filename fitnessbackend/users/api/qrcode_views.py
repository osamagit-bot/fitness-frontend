# users/api/qrcode_views.py

import qrcode
import io
import base64
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.utils import timezone
from django.db import IntegrityError
from ..models import Member, Attendance

class GenerateMemberQRCode(APIView):
    def get(self, request, member_id):
        try:
            member = Member.objects.get(id=member_id)
            
            # Generate QR code with member ID
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(str(member_id))  # Using member ID as QR data
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to bytes for response
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            
            # Return image
            return HttpResponse(buffer.getvalue(), content_type="image/png")
            
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MemberQRCodeDataURL(APIView):
    def get(self, request, member_id):
        try:
            # Print debug info
            print(f"Generating QR code for member ID: {member_id}")
            
            # Try to get the member
            try:
                member = Member.objects.get(id=member_id)
                print(f"Member found: {member}")
            except Member.DoesNotExist:
                print(f"Member not found with ID: {member_id}")
                return Response(
                    {"error": "Member not found", "member_id": member_id}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Generate QR code with member ID
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(str(member_id))
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 for data URL
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            data_url = f"data:image/png;base64,{img_str}"
            
            # Print length of data_url to verify
            print(f"Generated data URL of length: {len(data_url)}")
            
            # Return a consistent response format
            response_data = {
                "qr_code_data_url": data_url,
                "member_id": member_id,
                "status": "success"
            }
            
            print("Returning successful response")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error generating QR code: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e), "detail": "Failed to generate QR code"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CheckInView(APIView):
    def post(self, request):
        member_id = request.data.get('member_id')
        
        if not member_id:
            return Response({"error": "Member ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            member = Member.objects.get(id=member_id)
            
            # Create attendance record
            try:
                attendance = Attendance.objects.create(
                    member=member,
                    check_in_time=timezone.now(),
                    date=timezone.now().date()
                )
                
                return Response({
                    "message": f"Check-in successful for {member.user.username}",
                    "check_in_time": attendance.check_in_time
                })
                
            except IntegrityError:
                # Member already checked in today
                attendance = Attendance.objects.get(member=member, date=timezone.now().date())
                return Response({
                    "message": f"{member.user.username} already checked in today",
                    "check_in_time": attendance.check_in_time
                }, status=status.HTTP_409_CONFLICT)
                
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AttendanceHistoryView(APIView):
    def get(self, request, member_id=None):
        try:
            # Get date filters if provided
            date = request.query_params.get('date')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            print(f"AttendanceHistoryView called with member_id={member_id}, date={date}, start_date={start_date}, end_date={end_date}")
            
            # Base queryset
            queryset = Attendance.objects.all().order_by('-date', '-check_in_time')
            
            # Filter by member if provided
            if member_id:
                try:
                    member = Member.objects.get(id=member_id)
                    queryset = queryset.filter(member=member)
                    print(f"Filtered for member {member_id}, found {queryset.count()} records")
                except Member.DoesNotExist:
                    print(f"Member not found with ID: {member_id}")
                    return Response({"error": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Apply date filters if provided
            if date:
                queryset = queryset.filter(date=date)
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Build response data
            attendance_data = []
            for attendance in queryset:
                attendance_data.append({
                    'id': attendance.id,
                    'member_id': attendance.member.id,
                    'member_name': attendance.member.user.username,
                    'date': str(attendance.date),
                    'check_in_time': attendance.check_in_time.strftime('%H:%M:%S')
                })
            
            print(f"Returning {len(attendance_data)} attendance records")
            return Response(attendance_data)
        except Exception as e:
            print(f"Error in AttendanceHistoryView: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # users/qr_code_utils.py
import qrcode
import io
import base64

def generate_qr_code_image(data):
    """Generate a QR code image and return it as bytes"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        print(f"Error generating QR code: {e}")
        raise

def generate_qr_code_data_url(data):
    """Generate a QR code as a base64 data URL"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Error generating QR code data URL: {e}")
        raise