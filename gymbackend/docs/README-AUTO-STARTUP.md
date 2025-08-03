# 🚀 GymFitness Auto Startup Guide

This guide will help you set up automatic startup for GymFitness when your laptop turns on.

## 📋 Setup Instructions

### 1. Install Auto Startup
```bash
# Run this once to install auto startup
install-auto-startup.bat
```

### 2. What happens after installation:
- ✅ GymFitness will start automatically when you turn on your laptop
- ✅ Backend server with WebSocket support will start
- ✅ Frontend development server will start
- ✅ All services will be ready in ~20 seconds after boot

### 3. Access your application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000
- **WebSocket**: ws://127.0.0.1:8001
- **Admin Panel**: http://127.0.0.1:8000/admin

## 🛠️ Management Commands

### Manual Start (without auto startup)
```bash
# Start everything manually
auto-start-gym.bat

# Or start individually
start-dev.bat
```

### Disable Auto Startup
```bash
# Remove auto startup
uninstall-auto-startup.bat
```

### Re-enable Auto Startup
```bash
# Install again
install-auto-startup.bat
```

## 🔧 Troubleshooting

### If services don't start:
1. Check if Python virtual environment exists in `gymbackend/venv/`
2. Check if Node.js dependencies are installed in `fitness-frontend/node_modules/`
3. Run `start-dev.bat` manually to see error messages

### If auto startup doesn't work:
1. Check Windows Startup folder: `Win+R` → `shell:startup`
2. Look for "GymFitness Auto Start.lnk"
3. Right-click and check properties

### Manual startup folder access:
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```

## 📝 Notes

- Auto startup waits 10 seconds after boot for system stability
- Backend starts first, then frontend after 8 seconds
- WebSocket notifications are automatically enabled
- All terminal windows remain open for monitoring
- Services start in separate command windows for easy management

## 🔄 System Requirements

- Windows 10/11
- Python 3.8+ with virtual environment set up
- Node.js 16+ with dependencies installed
- Administrator privileges for initial installation