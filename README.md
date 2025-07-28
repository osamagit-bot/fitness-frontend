# 🏋️ GymFitness Club Management System

A comprehensive full-stack web application for managing fitness gym operations, built with React frontend and Django backend.

## 🚀 Features

### 👥 User Management
- **Admin Dashboard** - Complete gym management control
- **Member Portal** - Personal dashboard and profile management
- **Trainer Management** - Trainer profiles and scheduling
- **Multi-role Authentication** - Secure login system

### 📊 Core Functionality
- **Attendance Tracking** - Real-time check-in/check-out system
- **Membership Management** - Registration, renewals, and billing
- **Training Sessions** - Schedule and manage workout sessions
- **Product Sales** - Gym equipment and supplement sales
- **Revenue Tracking** - Financial analytics and reporting
- **Community Features** - Member interaction and announcements

### 🔧 Technical Features
- **Kiosk Mode** - Self-service check-in system
- **QR Code Integration** - Quick member identification
- **Real-time Notifications** - Email and WhatsApp alerts
- **Responsive Design** - Mobile-friendly interface
- **Backup System** - Automated data backup

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Chart.js** - Data visualization
- **React Router** - Navigation
- **Axios** - API communication

### Backend
- **Django 5.1** - Python web framework
- **Django REST Framework** - API development
- **SQLite** - Development database
- **Channels** - WebSocket support
- **JWT Authentication** - Secure token-based auth
- **SendGrid** - Email service integration

## 📁 Project Structure

```
GymFitness_Club_MS/
├── fitness-frontend/          # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── utils/            # Utility functions
│   │   └── styles/           # CSS files
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
│
├── gymbackend/               # Django backend application
│   ├── apps/                 # Django applications
│   │   ├── Authentication/   # User management
│   │   ├── Member/          # Member operations
│   │   ├── Attendance/      # Check-in/out system
│   │   ├── Community/       # Social features
│   │   ├── Purchase/        # Sales management
│   │   └── Notifications/   # Alert system
│   ├── backup_system/       # Automated backups
│   ├── media/              # User uploads
│   └── requirements.txt    # Backend dependencies
│
└── docs/                   # Documentation files
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+**
- **Node.js 16+**
- **npm or yarn**

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd gymbackend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # macOS/Linux
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   copy .env.example .env
   # Edit .env with your configuration
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd fitness-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   copy .env.example .env
   # Edit .env with your API endpoints
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///db.sqlite3
SENDGRID_API_KEY=your-sendgrid-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=GymFitness Club
```

## 📱 Usage

### Admin Features
- Access admin dashboard at `/admin/dashboard`
- Manage members, trainers, and staff
- View revenue reports and analytics
- Configure gym settings and notifications

### Member Features
- Personal dashboard with attendance history
- Training session booking
- Profile management
- Community interaction

### Kiosk Mode
- Self-service check-in at `/kiosk`
- QR code scanning for quick access
- Touchscreen-friendly interface

## 🔒 Security Features

- **JWT Authentication** - Secure token-based login
- **Role-based Access Control** - Different permission levels
- **CORS Protection** - Cross-origin request security
- **Input Validation** - Data sanitization
- **Environment Variables** - Sensitive data protection

## 📊 API Documentation

The backend provides RESTful APIs for:
- `/api/auth/` - Authentication endpoints
- `/api/members/` - Member management
- `/api/attendance/` - Attendance tracking
- `/api/trainers/` - Trainer operations
- `/api/products/` - Product management

## 🚀 Deployment

### Production Checklist
- [ ] Set `DEBUG=False` in Django settings
- [ ] Configure production database (PostgreSQL/MySQL)
- [ ] Setup static file serving
- [ ] Configure email service (SendGrid/AWS SES)
- [ ] Setup SSL certificates
- [ ] Configure domain and DNS
- [ ] Setup monitoring and logging

### Deployment Options
- **Frontend**: Netlify, Vercel, or AWS S3
- **Backend**: Heroku, DigitalOcean, or AWS EC2
- **Database**: PostgreSQL on AWS RDS or DigitalOcean

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs/`
- Review the troubleshooting guide

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added kiosk mode and QR integration
- **v1.2.0** - Enhanced notification system
- **v1.3.0** - Improved backup system

---

**Built with ❤️ for fitness enthusiasts and gym owners**