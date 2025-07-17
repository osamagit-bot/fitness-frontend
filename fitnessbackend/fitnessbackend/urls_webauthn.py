from django.urls import path
from users.views import (
    WebAuthnRegistrationView,
    WebAuthnRegisterCompleteView,
    WebAuthnAuthenticationView,
    WebAuthnAuthenticateCompleteView,
)

urlpatterns = [
    path('register/begin/', WebAuthnRegistrationView.as_view(), name='webauthn_register_begin'),
    path('register/complete/', WebAuthnRegisterCompleteView.as_view(), name='webauthn_register_complete'),
    path('authenticate/begin/', WebAuthnAuthenticationView.as_view(), name='webauthn_authenticate_begin'),
    path('authenticate/complete/', WebAuthnAuthenticateCompleteView.as_view(), name='webauthn_authenticate_complete'),
]
