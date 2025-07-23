# fitnessbackend/users/payments_views.py
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import random
import string
import logging
import os
import time
import requests
import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny



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
        # Debug: Print raw request data
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request content type: {request.content_type}")
        print(f"DEBUG: Request body: {request.body}")
        print(f"DEBUG: Request data: {request.data}")
        
        # Use request.data for DRF API views instead of json.loads
        data = request.data
        phone_number = data.get('phoneNumber')
        amount = data.get('amount')
        items = data.get('items', [])
        
        # Enhanced validation
        if not phone_number:
            return JsonResponse({'success': False, 'message': 'Phone number is required'}, status=400)
            
        if not amount or float(amount) <= 0:
            return JsonResponse({'success': False, 'message': 'Invalid amount'}, status=400)
            
        if not items:
            return JsonResponse({'success': False, 'message': 'No items in cart'}, status=400)
        
        # Validate phone number (Afghan format)
        afghan_phone_pattern = r'^(07\d{8}|\+937\d{8})$'
        if not re.match(afghan_phone_pattern, phone_number):
            return JsonResponse({
                'success': False,
                'message': 'Invalid Afghan phone number. Use format: 07XXXXXXXX or +937XXXXXXXX'
            }, status=400)
        
        # Format phone number
        if phone_number.startswith('07'):
            formatted_phone = '+93' + phone_number[1:]
        else:
            formatted_phone = phone_number
            
        # Production API Integration
        if HISAB_PAY_API_KEY and HISAB_PAY_MERCHANT_ID:
            try:
                # Enhanced payload with more details
                hisab_payload = {
                    'merchantId': HISAB_PAY_MERCHANT_ID,
                    'phoneNumber': formatted_phone,
                    'amount': float(amount),
                    'currency': 'AFN',
                    'reference': f"GYM-{int(time.time())}-{random.randint(1000, 9999)}",
                    'description': f"Gym purchase: {len(items)} items",
                    'callbackUrl': f"{request.build_absolute_uri('/')[:-1]}/api/payments/hisab-pay/callback/",
                    'items': [
                        {
                            'name': item.get('name', 'Product'),
                            'quantity': item.get('quantity', 1),
                            'price': item.get('price', 0)
                        } for item in items
                    ]
                }
                
                # API request with timeout and retry logic
                hisab_response = requests.post(
                    f"{HISAB_PAY_API_URL}/payments/initiate",
                    json=hisab_payload,
                    headers={
                        'Authorization': f"Bearer {HISAB_PAY_API_KEY}",
                        'Content-Type': 'application/json',
                        'User-Agent': 'GymFitness/1.0'
                    },
                    timeout=30  # 30 second timeout
                )
                
                if hisab_response.status_code == 200:
                    response_data = hisab_response.json()
                    
                    # Log successful transaction
                    logger.info(f"HisabPay transaction initiated: {response_data.get('transactionId')} for amount: {amount}")
                    
                    return JsonResponse({
                        'success': True,
                        'transactionId': response_data.get('transactionId'),
                        'amount': amount,
                        'reference': hisab_payload['reference'],
                        'message': 'Payment initiated successfully',
                        'paymentUrl': response_data.get('paymentUrl')  # If HisabPay provides redirect URL
                    })
                else:
                    logger.error(f"HisabPay API error: Status {hisab_response.status_code}, Response: {hisab_response.text}")
                    return JsonResponse({
                        'success': False,
                        'message': 'Payment service temporarily unavailable. Please try again.'
                    }, status=503)
                    
            except requests.exceptions.Timeout:
                logger.error("HisabPay API timeout")
                return JsonResponse({
                    'success': False,
                    'message': 'Payment service timeout. Please try again.'
                }, status=504)
                
            except requests.exceptions.ConnectionError:
                logger.error("HisabPay API connection error")
                return JsonResponse({
                    'success': False,
                    'message': 'Unable to connect to payment service. Please check your internet connection.'
                }, status=503)
                
            except Exception as api_error:
                logger.error(f"HisabPay API unexpected error: {str(api_error)}")
                return JsonResponse({
                    'success': False,
                    'message': 'Payment processing error. Please try again later.'
                }, status=500)
        
        else:
            # Simulation mode with warning
            transaction_id = f"SIM-{int(time.time())}-{random.randint(1000, 9999)}"
            
            logger.warning(f"[SIMULATION MODE] Transaction: {transaction_id} for amount: {amount}")
            
            return JsonResponse({
                'success': True,
                'transactionId': transaction_id,
                'amount': amount,
                'message': 'Payment processed successfully (Simulation Mode)',
                'simulation': True,
                'warning': 'This is a test transaction. Configure HisabPay credentials for production.'
            })
        
    except Exception as e:
        logger.error(f"Payment processing error: {str(e)}")
        print(f"DEBUG: Payment error - {str(e)}")  # For debugging
        return JsonResponse({
            'success': False,
            'message': f'Payment processing error: {str(e)}',
            'debug': str(e) if settings.DEBUG else 'Internal server error'
        }, status=500)

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def hisab_pay_callback(request):
    """
    Handle HisabPay payment status callbacks
    """
    try:
        # Use request.data for DRF API views
        data = request.data
        transaction_id = data.get('transactionId')
        status = data.get('status')
        reference = data.get('reference')
        
        logger.info(f"HisabPay callback: {transaction_id} - Status: {status}")
        
        # Update payment status in your database
        # You might want to create a Payment model to track this
        
        if status == 'SUCCESS':
            # Payment successful - update order status
            logger.info(f"Payment confirmed: {transaction_id}")
            # Add your success logic here
            
        elif status == 'FAILED':
            # Payment failed - handle accordingly
            logger.warning(f"Payment failed: {transaction_id}")
            # Add your failure logic here
            
        return JsonResponse({'status': 'received'})
        
    except Exception as e:
        logger.error(f"Callback processing error: {str(e)}")
        return JsonResponse({'error': 'Callback processing failed'}, status=500)
