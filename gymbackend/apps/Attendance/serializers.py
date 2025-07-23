from rest_framework import serializers
from .models import Attendance
from apps.Member.models import Member

        

class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['check_in_time', 'date']
    
    def get_member_name(self, obj):
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}"
        return "Unknown"
        

