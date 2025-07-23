import pytz
from django.utils import timezone

def convert_to_afghanistan_time(utc_time):
    """Convert UTC time to Afghanistan timezone"""
    kabul_tz = pytz.timezone('Asia/Kabul')
    if timezone.is_aware(utc_time):
        return utc_time.astimezone(kabul_tz)
    else:
        # If naive datetime, assume it's UTC
        utc_time = timezone.make_aware(utc_time, timezone.utc)
        return utc_time.astimezone(kabul_tz)

def format_afghanistan_time(utc_time):
    """Format time in Afghanistan timezone for display"""
    local_time = convert_to_afghanistan_time(utc_time)
    return local_time.strftime('%Y-%m-%d %I:%M:%S %p')