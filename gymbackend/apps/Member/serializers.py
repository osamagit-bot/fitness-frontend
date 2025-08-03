from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Member, Trainer,Training
from django.core.exceptions import ObjectDoesNotExist



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
            'pin', 'pin_enabled',
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

        # Check if this is a restoration (user already exists)
        user_id = self.initial_data.get('user')
        if user_id and User.objects.filter(id=user_id).exists():
            # This is a restoration - use existing user
            user = User.objects.get(id=user_id)
            member = Member.objects.create(user=user, **validated_data)
            return member

        # Normal member creation
        athlete_id = validated_data.get('athlete_id')
        first_name = validated_data.get('first_name', '').lower()
        email = validated_data.get('email')
        if not email:
            email = self.initial_data.get('email')
        if not email:
            email = f"{athlete_id}@gym.temp"
        
        username = self.initial_data.get('username')
        if not username:
            username = f"{first_name}{athlete_id}"

        import secrets
        temp_password = password or secrets.token_urlsafe(12)

        existing_user = User.objects.filter(username=username).first()
        if not existing_user:
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
    
    

# Trainer serializer
class TrainerSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)
    
    class Meta:
        model = Trainer
        fields = ['id', 'trainer_id', 'first_name', 'last_name', 'email', 'phone', 
                  'monthly_salary', 'specialization', 'start_date', 'image']
        # Remove user, username, password fields completely
    
    def create(self, validated_data):
        # Create trainer without user relationship
        trainer = Trainer.objects.create(**validated_data)
        return trainer
    



# Training serializer
class TrainingSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False)
    trainer_email = serializers.SerializerMethodField()
 
    
    class Meta:
        model = Training
        fields = ['id', 'trainer', 'trainer_name', 'type', 'datetime', 'duration','trainer_email', 'capacity', 'description','image']
    
    def get_trainer_name(self, obj):
        return f"{obj.trainer.first_name} {obj.trainer.last_name}"
    def get_trainer_email(self, obj):
        return obj.trainer.email

