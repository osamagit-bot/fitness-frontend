from .models import CustomUser  
from django.contrib.auth import get_user_model
from rest_framework import serializers
from apps.Member.models import Member
from apps.Member.serializers import MemberSerializer
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken




User = get_user_model()  # This now correctly refers to your CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['email', 'username']


# Serializer for user registration
class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())],
        error_messages={'unique': 'A user with this email already exists.'}
    )
    password1 = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2', 'role')
        extra_kwargs = {
            'username': {
                'required': True,
                'validators': [UniqueValidator(queryset=User.objects.all())]
            },
            'role': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )

        valid_roles = ['member', 'trainer', 'admin']
        if attrs['role'] not in valid_roles:
            raise serializers.ValidationError(
                {"role": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}
            )

        return attrs

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password1'],
                role=validated_data['role']
            )
            return user
        except Exception as e:
            raise serializers.ValidationError({"error": str(e)})
        
        
        

# Serializer to retrieve user info along with their member details
class UserSerializer(serializers.ModelSerializer):
    member_details = MemberSerializer(source='member', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'date_joined', 'member_details')
        read_only_fields = ('id', 'date_joined', 'member_details')




# Custom JWT token serializer
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role if hasattr(user, 'role') else ''
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)

        # Attach member details if available
        member_data = {}
        if hasattr(self.user, 'member'):
            member_data = MemberSerializer(self.user.member).data

        data.update({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'token': str(refresh.access_token),  # Add this line for frontend compatibility
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'email': self.user.email,
                'role': getattr(self.user, 'role', ''),
                'date_joined': self.user.date_joined,
                'member_details': member_data
            }
        })
        return data


# Serializer for JWT token
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