from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Member, Trainer, Training,CustomUser
from .models import Product, Purchase, Notification, Post, Comment, Announcement, Challenge, SupportTicket, FAQ, FAQCategory, TicketResponse, TrainingSchedule, Attendance
from django.core.exceptions import ObjectDoesNotExist
User = get_user_model()  # This now correctly refers to your CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['email', 'username']


class MemberSerializer(serializers.ModelSerializer):
    # Accept username/password on input, but also expose username on output
    username = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    user_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Member
        fields = [
            'athlete_id', 'first_name', 'last_name', 'monthly_fee',
            'membership_type', 'phone', 'start_date', 'expiry_date',
            'box_number', 'time_slot', 'username', 'password', 'user', 'biometric_registered','user_email',
        ]
        read_only_fields = ['user']

    def get_username(self, obj):
        # Return the username from the related user
        return obj.user.username if obj.user else None
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Extract and remove password
        password = validated_data.pop('password', None)

        # ✅ Extract athlete_id first
        athlete_id = validated_data.get('athlete_id')
        first_name = validated_data.get('first_name', '').lower()
        email = validated_data.get('email')
        if not email:
            email = self.initial_data.get('email')
        if not email:
            email = f"{athlete_id}@gym.temp"
        username = self.initial_data.get('username') or f"{first_name}{athlete_id}"

        # Generate a secure temporary password if not provided
        import secrets
        temp_password = password or secrets.token_urlsafe(12)

        # ✅ Prevent duplicate email
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            user = existing_user
        else:
            user = User.objects.create_user(
                email=email,
                username=username,
                password=temp_password,
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', '')
            )

        if hasattr(user, 'role'):
            user.role = 'member'
            user.save()

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
    





    
    
class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'date_created']
        read_only_fields = ['date_created']

    
class ChallengeSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = ['id', 'title', 'description', 'start_date', 'end_date', 'participants', 'date_created']
        read_only_fields = ['date_created']

    def get_participants(self, obj):
        return obj.participants.count()


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
    
"""  
class CommunitySerializer(serializers.ModelSerializer):
    challenges = ChallengeSerializer(many=True)

    class Meta:
        model = Community
        fields = ['id', 'name', 'challenges']
"""

    
    

class SupportTicketSerializer(serializers.ModelSerializer):
    responses = TicketResponseSerializer(many=True, read_only=True)
    date = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = ['id', 'subject', 'message', 'status', 'date', 'type', 'responses', 'member_name', 'member']
        extra_kwargs = {
            'member': {'read_only': True}  
        }

    def get_date(self, obj):
        return obj.date_created

    def get_member_name(self, obj):
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}"
        return "Unknown"


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'category']


class FAQCategorySerializer(serializers.ModelSerializer):
    faqs = FAQSerializer(many=True, read_only=True)
    
    class Meta:
        model = FAQCategory
        fields = ['id', 'name', 'faqs']




class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = Purchase
        fields = ['id', 'member', 'product', 'product_name', 'quantity', 'total_price', 'date']
        extra_kwargs = {
            'member':{'required':False, 'allow_null':True}
        }
        read_only_fields = ['id', 'date', 'product_name']
        
        
        
        
        
class NotificationSerializer(serializers.ModelSerializer):
     class Meta:
        model = Notification
        fields = '__all__'    
        
        
class TrainingScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSchedule
        fields = '__all__'
        
        

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['check_in_time', 'date']
        
        
        
class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'date_created']
        read_only_fields = ['id', 'author', 'date_created']

    def get_author(self, obj):
        return obj.author.username if obj.author else "Anonymous"



class PostSerializer(serializers.ModelSerializer):
    comments_list = CommentSerializer(source='comments', many=True, read_only=True)
    author = serializers.SerializerMethodField(read_only=True)
    date = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)
    isCoach = serializers.SerializerMethodField(read_only=True)
    likes = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author', 'date', 'likes', 'comments', 'isCoach', 'comments_list']
        read_only_fields = ['author', 'date', 'likes', 'comments', 'isCoach']
    
    def get_author(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return None
        full_name = user.get_full_name()
        return full_name if full_name else user.username
    
    def get_date(self, obj):
        if hasattr(obj, 'date_created') and obj.date_created:
            return obj.date_created.isoformat()
        return None
    
    def get_comments(self, obj):
        return obj.comments.count() if hasattr(obj, 'comments') else 0
    
    def get_isCoach(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return False
        return hasattr(user, 'trainer')
   
    def get_likes(self, obj):
        try:
            return obj.likes.count()
        except AttributeError:
            return 0
