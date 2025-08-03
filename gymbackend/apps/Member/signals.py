from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Member, MembershipRevenue


@receiver(post_save, sender=Member)
def update_membership_revenue_on_save(sender, instance, created, **kwargs):
    """Add revenue when a new member is created (they pay for current month)"""
    if created:  # Only for new members
        try:
            MembershipRevenue.add_member_revenue(instance.monthly_fee)
            print(f"Added {instance.monthly_fee} AFN revenue for new member: {instance.first_name} {instance.last_name}")
        except Exception as e:
            print(f"Error adding membership revenue: {e}")
    # Note: We don't update revenue when member details are just updated


@receiver(post_delete, sender=Member)
def handle_member_deletion(sender, instance, **kwargs):
    """Handle member deletion - revenue stays (they already paid for this month)"""
    try:
        print(f"ℹ️  Member deleted: {instance.first_name} {instance.last_name}")
        print(f"💰 Revenue remains unchanged (member already paid {instance.monthly_fee} AFN for this month)")
        # Intentionally do NOT reduce revenue - they already paid for this month
    except Exception as e:
        print(f"❌ Error handling member deletion: {e}")