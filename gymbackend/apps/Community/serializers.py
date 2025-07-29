from rest_framework import serializers

from .models import Announcement,Challenge,TicketResponse,SupportTicket,FAQ,FAQCategory,Post,Comment

from apps.Notifications.models import Notification


     
   
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
        # Count participants from ChallengeParticipant model instead of ManyToManyField
        from .models import ChallengeParticipant
        return ChallengeParticipant.objects.filter(challenge=obj).count()


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

        
        
class NotificationSerializer(serializers.ModelSerializer):
     class Meta:
        model = Notification
        fields = '__all__'    
        

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

       
        
class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'parent_comment', 'date_created']
        read_only_fields = ['id', 'author','post', 'date_created']

    def get_author(self, obj):
        if not obj.author:
            return "Anonymous"
        try:
            member = obj.author.member
            return f"{member.first_name} {member.last_name}"
        except:
            full_name = obj.author.get_full_name()
            return full_name if full_name else obj.author.username



class PostSerializer(serializers.ModelSerializer):
    comments_list = CommentSerializer(source='comments', many=True, read_only=True)
    author = serializers.SerializerMethodField(read_only=True)
    date = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)
    isCoach = serializers.SerializerMethodField(read_only=True)
    likes = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'image', 'author', 'date', 'likes', 'comments', 'isCoach', 'comments_list']
        read_only_fields = ['author', 'date', 'likes', 'comments', 'isCoach']
    
    def get_author(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return "Unknown"
        try:
            member = user.member
            return f"{member.first_name} {member.last_name}"
        except:
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
        
