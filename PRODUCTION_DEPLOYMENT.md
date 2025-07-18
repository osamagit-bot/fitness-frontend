# Production Deployment Guide

## 🚀 WebSocket Production Readiness Checklist

### ✅ Backend Configuration
- **Environment-based settings** (dev/production)
- **Redis integration** for scalable channel layers
- **Origin validation** for WebSocket security
- **Dynamic ALLOWED_HOSTS** configuration
- **Production-ready error handling**

### ✅ Frontend Configuration
- **Environment variables** for backend URLs
- **Auto-reconnection** with exponential backoff
- **Connection health monitoring** (heartbeat)
- **Error boundaries** and graceful degradation
- **Optimized build** ready for deployment

### ✅ Security Features
- **JWT Authentication** for WebSocket connections
- **Origin validation** in production
- **CORS configuration** for cross-origin requests
- **Token expiration** handling
- **Input validation** and sanitization

### ✅ Scalability & Performance
- **Redis channel layer** for multi-server deployments
- **Connection pooling** and resource management
- **Heartbeat mechanism** to prevent connection drops
- **Efficient message routing** to specific users
- **Graceful error recovery**

## 🔧 Production Deployment Steps

### 1. Backend Setup
```bash
# Set environment variables
export DJANGO_ENVIRONMENT=production
export DJANGO_DEBUG=False
export SECRET_KEY="your-production-secret-key"
export REDIS_URL="redis://your-redis-server:6379"
export BACKEND_DOMAIN="your-backend-domain.com"
export FRONTEND_DOMAIN="your-frontend-domain.com"

# Install Redis (if not using cloud Redis)
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Run Django with production settings
python manage.py collectstatic --noinput
python manage.py migrate
daphne -b 0.0.0.0 -p 8001 fitnessbackend.asgi:application
```

### 2. Frontend Setup
```bash
# Create production environment file
cp .env.production .env

# Update with your production URLs
VITE_BACKEND_WS_HOST=your-backend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com

# Build for production
npm run build

# Serve with nginx or similar
```

### 3. WebSocket URL Configuration
- **Development**: `ws://localhost:8001/ws/notifications/`
- **Production**: `wss://your-backend-domain.com/ws/notifications/`

### 4. Load Balancer Configuration
If using multiple servers, configure your load balancer for sticky sessions:
```nginx
upstream backend {
    ip_hash;  # Ensures WebSocket connections stick to same server
    server backend1.example.com:8001;
    server backend2.example.com:8001;
}
```

## 📊 Monitoring & Logging

### WebSocket Metrics to Monitor
- **Connection count** and duration
- **Message throughput** and latency
- **Reconnection attempts** and failures
- **Redis memory usage** and connection pool
- **Error rates** and response times

### Log Analysis
- Monitor Django Channels logs for WebSocket events
- Track authentication failures and security events
- Monitor Redis performance and memory usage
- Alert on high reconnection rates or connection failures

## 🔒 Security Considerations

### Production Security Checklist
- ✅ **HTTPS/WSS only** in production
- ✅ **Origin validation** enabled
- ✅ **JWT token expiration** configured
- ✅ **Rate limiting** for WebSocket connections
- ✅ **Input validation** for all messages
- ✅ **Secure Redis configuration**

### Security Best Practices
- Use WSS (WebSocket Secure) in production
- Implement rate limiting to prevent abuse
- Regularly rotate JWT secret keys
- Monitor for suspicious connection patterns
- Use Redis AUTH for database security

## 🏆 Performance Optimization

### Recommended Settings
```python
# Django Channels Redis settings for production
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis-server", 6379)],
            "capacity": 1500,  # Maximum messages per channel
            "expiry": 60,      # Message expiry in seconds
        },
    },
}
```

### Frontend Optimization
- Implement message queuing for offline scenarios
- Use connection pooling for multiple WebSocket needs
- Implement proper error boundaries
- Add performance monitoring for connection metrics

## 🚨 Troubleshooting

### Common Issues
1. **Connection refused**: Check Redis server and WebSocket URLs
2. **Authentication failures**: Verify JWT token validity
3. **Origin errors**: Ensure ALLOWED_HOSTS includes your domain
4. **Memory leaks**: Monitor connection cleanup and Redis usage
5. **High latency**: Check network configuration and Redis performance

### Health Checks
```python
# Add health check endpoint
def websocket_health_check(request):
    # Check Redis connection
    # Check Django Channels status
    # Return health status
```

## 🎯 Final Status: PRODUCTION READY ✅

Your WebSocket implementation is now production-ready with:
- Scalable Redis backend
- Security best practices
- Auto-reconnection and error handling
- Environment-based configuration
- Monitoring capabilities
- Professional UI/UX
