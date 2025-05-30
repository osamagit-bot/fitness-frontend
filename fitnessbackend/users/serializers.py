from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Member, Trainer, Training 
from .models import  Product

User = get_user_model()

# Serializer for the Member model
class MemberSerializer(serializers.ModelSerializer):
    # Add explicit fields for username and password
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    
    class Meta:
        model = Member
        fields = [
            'athlete_id', 'first_name', 'last_name', 'monthly_fee',
            'membership_type', 'start_date', 'expiry_date',
            'box_number', 'time_slot', 'username', 'password', 'user', 'biometric_registered', 
        ]
        read_only_fields = ['user']
    
    def create(self, validated_data):
        """
        Handle both cases - with and without explicit username/password
        """
        # Get the user model properly
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Check if username and password were provided
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        
        if username and password:
            # Use provided username and password
            user = User.objects.create_user(
                username=username,
                email=validated_data.get('email', f"{username}@gym.temp"),
                password=password
            )
        else:
            # Fall back to old behavior for compatibility
            athlete_id = validated_data.get('athlete_id')
            email = f"{athlete_id}@gym.temp"
            unique_username = f"member_{athlete_id}"
            
            import secrets
            temp_password = secrets.token_urlsafe(12)
            
            user = User.objects.create_user(
                email=email,
                username=unique_username,
                password=temp_password,
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', '')
            )
        
        # Set user role if applicable
        if hasattr(user, 'role'):
            user.role = 'member'
            user.save()
        
        # Create member with user relationship
        member = Member.objects.create(user=user, **validated_data)
        return member

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

# Product serializer
class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['product_id', 'name', 'price', 'image', 'image_url', 'description', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

# Attendance serializer


# Training serializer
class TrainingSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Training
        fields = ['id', 'trainer', 'trainer_name', 'type', 'datetime', 'duration', 'capacity', 'description']
    
    def get_trainer_name(self, obj):
        return f"{obj.trainer.first_name} {obj.trainer.last_name}"

# Trainer serializer
class TrainerSerializer(serializers.ModelSerializer):
    # Add explicit fields for username and password
    username = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = Trainer
        fields = ['id', 'trainer_id', 'first_name', 'last_name', 'email', 'phone', 
                  'monthly_salary', 'specialization', 'start_date', 'username', 'password', 'user']
        read_only_fields = ['user']
    
    def get_username(self, obj):
        # Get username from the related User model
        return obj.user.username if obj.user else 'N/A'
    
    def get_password(self, obj):
        # For security, just return placeholder stars
        return '••••••••' if obj.user else 'N/A'
    
    def create(self, validated_data):
        # Extract username and password for User creation
        username = self.context['request'].data.get('username')
        password = self.context['request'].data.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Username and password are required')
        
        # Create user
        User = get_user_model()
        user = User.objects.create_user(
            username=username,
            password=password,
            email=validated_data.get('email', '')
        )
        
        # Create trainer with user reference
        trainer = Trainer.objects.create(
            user=user,
            **validated_data
        )
        
        return trainer
    




# In your Django serializers.py
# users/serializers.py

from rest_framework import serializers
from .models import Post, Comment, Announcement, Challenge, SupportTicket, FAQ, FAQCategory, TicketResponse
from django.contrib.auth.models import User

class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField(read_only=True)
    date = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)
    isCoach = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'date', 'likes', 'comments', 'isCoach']
        read_only_fields = ['author', 'date', 'likes', 'comments', 'isCoach']
    
    def get_author(self, obj):
        return obj.author.get_full_name() or obj.author.username
    
    def get_date(self, obj):
        return obj.date_created
    
    def get_comments(self, obj):
        return obj.comments.count()
    
    def get_isCoach(self, obj):
        # Check if the user has a trainer profile
        return hasattr(obj.author, 'trainer')
class AnnouncementSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'date', 'creator_name']
    
    def get_date(self, obj):
        return obj.date_created
        
    def get_creator_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username

class ChallengeSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    endDate = serializers.SerializerMethodField()
    
    class Meta:
        model = Challenge
        fields = ['id', 'title', 'description', 'participants', 'endDate']
    
    def get_participants(self, obj):
        return obj.participants.count()
    
    def get_endDate(self, obj):
        return obj.end_date

class TicketResponseSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    
    class Meta:
        model = TicketResponse
        fields = ['author', 'message', 'date']
    
    def get_author(self, obj):
        return obj.responder.get_full_name() or obj.responder.username
    
    def get_date(self, obj):
        return obj.date_created

class SupportTicketSerializer(serializers.ModelSerializer):
    responses = TicketResponseSerializer(many=True, read_only=True)
    date = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportTicket
        fields = ['id', 'subject', 'message', 'status', 'date', 'type', 'responses']
    
    def get_date(self, obj):
        return obj.date_created

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['question', 'answer']

class FAQCategorySerializer(serializers.ModelSerializer):
    faqs = FAQSerializer(many=True, read_only=True)
    
    class Meta:
        model = FAQCategory
        fields = ['id', 'name', 'faqs']