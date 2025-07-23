# Production Deployment Guide

## Environment Setup

### 1. Development
```bash
cp .env.example .env
npm run dev
```

### 2. Production Build
```bash
# Set production environment variables
cp .env.production .env.local

# Update with your actual production URLs
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_BACKEND_WS_HOST=your-backend-domain.com

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### 3. Deployment Checklist
- [ ] Environment variables configured
- [ ] API endpoints accessible
- [ ] WebSocket connections working
- [ ] Error reporting configured
- [ ] Performance monitoring setup
- [ ] Security headers configured
- [ ] SSL certificates installed

## Performance Optimization
- Bundle size optimized with code splitting
- Images optimized and compressed
- Lazy loading implemented
- Caching strategies configured

## Security Features
- Input sanitization
- Secure storage implementation
- Rate limiting
- Error boundary protection
- Environment-based logging








#Deployment Steps    

# 1. Clone and setup
git clone your-repo
cd gymbackend

# 2. Create production environment
cp .env.production.template .env.production
# Edit .env.production with your values

# 3. Run deployment script
chmod +x deploy.sh
./deploy.sh

# 4. Start production server
daphne -b 0.0.0.0 -p 8000 gymbackend.asgi:application