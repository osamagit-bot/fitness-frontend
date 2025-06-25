import logging

class LogAuthHeaderMiddleware:
    """
    Middleware to log the Authorization header for incoming requests.
    Useful for debugging token presence and validity.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        logging.info(f"Authorization header: {auth_header}")
        response = self.get_response(request)
        return response
