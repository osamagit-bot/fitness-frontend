from django.db import models
from django.conf import settings
from apps.Member.models import Member
from django.contrib.auth.models import BaseUserManager, AbstractUser, Group, Permission







class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    date_created = models.DateTimeField(auto_now_add=True)  
    hidden = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_posts', blank=True)  
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-date_created', '-id']  # Default ordering
        verbose_name = "Post"
        verbose_name_plural = "Posts"
    
    
# Announcement 
class Announcement(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)  
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default='1', related_name='announcements')

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-date_created', '-id']  # Default ordering
        verbose_name = "Announcement"
        verbose_name_plural = "Announcements"
    
    
    
# Challenge model 
class Challenge(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_challenges')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='challenges', blank=True)
    date_created = models.DateTimeField(auto_now_add=True)  # Add this!

    def __str__(self):
        return self.title
    
    
    
    
# New ChallengeParticipant model
class ChallengeParticipant(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'Community'
        unique_together = ('challenge', 'member')

    def __str__(self):
        return f"{self.member.first_name} joined {self.challenge.title}"
    
    

# The Comment model 
class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"

# Support ticket model 
class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('closed', 'Closed'),
    )
    
    TYPE_CHOICES = (
        ('general', 'General Inquiry'),
        ('technical', 'Technical Issue'),
        ('billing', 'Billing Question'),
        ('feedback', 'Feedback'),
        ('complaint', 'Complaint'),
    )
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='support_tickets')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Ticket #{self.id}: {self.subject}"

    class Meta:
        ordering = ['-date_created', '-id']  # Default ordering
        verbose_name = "Support Ticket"
        verbose_name_plural = "Support Tickets"
    
# Support ticket 
class TicketResponse(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='responses')
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_responses')
    message = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Response to ticket #{self.ticket.id}"

# FAQ Category model 
class FAQCategory(models.Model):
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name
    
    class Meta:
        app_label = 'Community'
        verbose_name_plural = "FAQ Categories"

# FAQ model 
class FAQ(models.Model):
    category = models.ForeignKey(FAQCategory, on_delete=models.CASCADE, related_name='faqs')
    question = models.CharField(max_length=255)
    answer = models.TextField()
    
    def __str__(self):
        return self.question
    
