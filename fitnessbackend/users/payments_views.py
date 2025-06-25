# fitnessbackend/users/payments_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import random
import string
import logging
import os
import time
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.conf import settings


logger = logging.getLogger(__name__)


HISAB_PAY_API_KEY = os.environ.get('HISAB_PAY_API_KEY', '')
HISAB_PAY_MERCHANT_ID = os.environ.get('HISAB_PAY_MERCHANT_ID', '')
HISAB_PAY_API_URL = os.environ.get('HISAB_PAY_API_URL', 'https://api.hisabpay.com/v1') 

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def hisab_pay(request):
    """
    Handle Hisab Pay payment processing
    """
    try:
        data = json.loads(request.body)
        phone_number = data.get('phoneNumber')
        amount = data.get('amount')
        items = data.get('items', [])
        
        # Validate phone number (Afghan format)
        if not phone_number or not (phone_number.startswith('07') and len(phone_number) == 10) and not (phone_number.startswith('+937') and len(phone_number) == 12):
            return JsonResponse({
                'success': False,
                'message': 'Invalid phone number format. Please use format: 07XXXXXXXX or +937XXXXXXXX'
            }, status=400)
        
        # Format phone number if needed (ensure it's in the format Hisab Pay expects)
        if phone_number.startswith('07'):
            formatted_phone = '+93' + phone_number[1:]
        else:
            formatted_phone = phone_number
            
        # Check if we have API credentials
        if HISAB_PAY_API_KEY and HISAB_PAY_MERCHANT_ID:
            # This will be the real API integration when you have credentials
            try:
                # Prepare the payload for Hisab Pay API
                hisab_payload = {
                    'merchantId': HISAB_PAY_MERCHANT_ID,
                    'phoneNumber': formatted_phone,
                    'amount': amount,
                    'currency': 'AFN',
                    'reference': f"Order-{int(time.time())}",  # Unique reference number
                    'description': f"Payment for {len(items)} items"
                }
                
                # Make the API request to Hisab Pay
                hisab_response = requests.post(
                    f"{HISAB_PAY_API_URL}/payments/initiate",
                    json=hisab_payload,
                    headers={
                        'Authorization': f"Bearer {HISAB_PAY_API_KEY}",
                        'Content-Type': 'application/json'
                    }
                )
                
                if hisab_response.status_code == 200:
                    response_data = hisab_response.json()
                    return JsonResponse({
                        'success': True,
                        'transactionId': response_data.get('transactionId'),
                        'amount': amount,
                        'message': 'Payment initiated successfully'
                    })
                else:
                    logger.error(f"Hisab Pay API error: {hisab_response.text}")
                    return JsonResponse({
                        'success': False,
                        'message': 'Payment service is currently unavailable. Please try again later.'
                    }, status=500)
                    
            except Exception as api_error:
                logger.error(f"Hisab Pay API request error: {str(api_error)}")
                return JsonResponse({
                    'success': False,
                    'message': 'Error connecting to payment service. Please try again later.'
                }, status=500)
        
        else:
            # Simulation mode - for testing until you get real API credentials
            # Generate a fake transaction ID
            transaction_id = 'HP' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            logger.info(f"[SIMULATION] Created transaction: {transaction_id} for amount: {amount}")
            
            return JsonResponse({
                'success': True,
                'transactionId': transaction_id,
                'amount': amount,
                'message': 'Payment processed successfully',
                'simulation': True  # Flag to indicate this is a simulation
            })
        
    except Exception as e:
        logger.error(f"Payment processing error: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': f'Error processing payment: {str(e)}'
        }, status=500)