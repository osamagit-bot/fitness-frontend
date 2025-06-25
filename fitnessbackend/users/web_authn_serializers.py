from rest_framework import serializers
from .models import WebAuthnCredential

class WebAuthnCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebAuthnCredential
        fields = ['id', 'member', 'credential_id', 'public_key', 'sign_count', 'rp_id', 'created_at']
        read_only_fields = ['id', 'created_at']
