# 📱 WhatsApp Notification System Setup Guide

## 🎯 **Overview**

Your gym management system now supports **dual-channel notifications**: Email + WhatsApp! Members and admins can receive notifications via both channels for maximum engagement.

---

## 🚀 **Quick Start Options**

### **Option 1: Twilio WhatsApp (Recommended for Beginners)**
- ✅ Easiest to set up
- ✅ Great documentation
- ✅ Reliable delivery
- 💰 Pay-per-message (~$0.005 per message)

### **Option 2: WhatsApp Business API (Official)**
- ✅ Official Facebook/Meta API
- ✅ More features and customization
- ⚠️ More complex setup
- 💰 Higher cost but official

### **Option 3: MessageBird (Multi-Channel)**
- ✅ SMS + WhatsApp + Voice in one platform
- ✅ Good for international businesses
- 💰 Competitive pricing

---

## 🔧 **Setup Instructions**

### **1. Twilio WhatsApp Setup (Recommended)**

#### **Step 1: Create Twilio Account**
1. Go to https://www.twilio.com/
2. Sign up for a free account
3. Get $15 free credit for testing

#### **Step 2: Set up WhatsApp Sandbox**
1. In Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join sandbox
3. Note your sandbox number (e.g., `+1415523876X`)

#### **Step 3: Install Twilio Library**
```bash
# In your gymbackend directory
pip install twilio
```

#### **Step 4: Configure Environment Variables**
```bash
# Add to your .env file
WHATSAPP_NOTIFICATIONS_ENABLED=True
WHATSAPP_SERVICE_PROVIDER=twilio
WHATSAPP_FROM_NUMBER=+1415523876X  # Your Twilio sandbox number
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
GYM_NAME=Your Gym Name
DEFAULT_COUNTRY_CODE=1  # US: 1, UK: 44, etc.
```

#### **Step 5: Test the Integration**
1. Go to Admin Settings → Notification Preferences
2. Toggle "WhatsApp Notifications" ON
3. Click "WhatsApp System Test"
4. Check your phone for test message!

---

### **2. WhatsApp Business API Setup (Advanced)**

#### **Step 1: Apply for WhatsApp Business API**
1. Go to https://business.whatsapp.com/
2. Apply for WhatsApp Business API access
3. Wait for approval (can take weeks)

#### **Step 2: Configure Environment Variables**
```bash
WHATSAPP_NOTIFICATIONS_ENABLED=True
WHATSAPP_SERVICE_PROVIDER=whatsapp_business
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_FROM_NUMBER=your_verified_number
```

---

### **3. MessageBird Setup**

#### **Step 1: Create MessageBird Account**
1. Go to https://www.messagebird.com/
2. Sign up and verify your account

#### **Step 2: Install MessageBird Library**
```bash
pip install messagebird
```

#### **Step 3: Configure Environment Variables**
```bash
WHATSAPP_NOTIFICATIONS_ENABLED=True
WHATSAPP_SERVICE_PROVIDER=messagebird
MESSAGEBIRD_API_KEY=your_api_key
WHATSAPP_FROM_NUMBER=your_verified_number
```

---

## 🎛️ **Admin Panel Features**

### **WhatsApp Settings in Admin Panel**
1. **WhatsApp Toggle**: Enable/disable WhatsApp notifications
2. **System Test**: Test WhatsApp configuration and connectivity
3. **Send Test**: Send a test WhatsApp message to admin phones
4. **Configuration View**: Check all WhatsApp settings

### **How to Access**
1. Login as admin
2. Go to Admin Settings
3. Navigate to "Notification Preferences"
4. Find the WhatsApp section

---

## 📋 **Environment Configuration Examples**

### **Development (.env)**
```bash
# WhatsApp Configuration - Development
WHATSAPP_NOTIFICATIONS_ENABLED=True
WHATSAPP_SERVICE_PROVIDER=twilio
WHATSAPP_FROM_NUMBER=+14155238886  # Twilio sandbox
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
GYM_NAME=My Awesome Gym
DEFAULT_COUNTRY_CODE=1

# Optional: Customize gym branding
GYM_NAME=FitnessPro Gym & Wellness Center
```

### **Production (.env.production)**
```bash
# WhatsApp Configuration - Production
WHATSAPP_NOTIFICATIONS_ENABLED=True
WHATSAPP_SERVICE_PROVIDER=twilio
WHATSAPP_FROM_NUMBER=+1234567890  # Your verified business number
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
GYM_NAME=FitnessPro Gym & Wellness Center
DEFAULT_COUNTRY_CODE=1
```

---

## 📱 **Message Examples**

### **Member Registration Notification**
```
🏋️ FitnessPro Gym Notification

New member registered: John Doe
Phone: +1234567890
Membership: Premium Monthly

---
This is an automated notification from your gym management system.
```

### **Payment Confirmation**
```
🏋️ FitnessPro Gym Notification

Payment received: $99.99
Member: Sarah Smith
Plan: Premium Membership
Valid until: 2025-02-23

---
This is an automated notification from your gym management system.
```

---

## 🔧 **Technical Integration**

### **How It Works**
1. **Signal Triggers**: Django signals detect events (new member, payment, etc.)
2. **Notification Service**: Processes the event and determines who to notify
3. **Dual Sending**: Sends both email AND WhatsApp notifications
4. **Error Handling**: Gracefully handles failures in either channel

### **Phone Number Requirements**
- Admin phones must be stored in the database
- Must include country code (e.g., +1234567890)
- Auto-formatting available for common formats

### **Message Formatting**
- Automatic gym branding
- Emoji support for better engagement
- Professional footer with disclaimer

---

## 🧪 **Testing Your Setup**

### **1. Admin Panel Testing**
```
1. Go to Admin Settings
2. Toggle WhatsApp notifications ON
3. Click "WhatsApp System Test"
4. Check console for configuration details
5. Click "Send Test" to send actual message
```

### **2. Django Shell Testing**
```python
python manage.py shell

from apps.Notifications.whatsapp_service import WhatsAppNotificationService

# Test configuration
service = WhatsAppNotificationService()
config = service.validate_whatsapp_configuration()
print(config)

# Send test message
result = service.send_admin_whatsapp_notification(
    "Test message from Django shell"
)
print(f"WhatsApp sent: {result}")
```

### **3. API Testing**
```bash
# Test via API endpoint
curl -X POST http://localhost:8000/api/notifications/test_whatsapp_system/ \
  -H "Authorization: Bearer your-admin-token"
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. "WhatsApp notifications are disabled"**
**Solution**: Set `WHATSAPP_NOTIFICATIONS_ENABLED=True` in your environment

#### **2. "No admin phone numbers found"**
**Solution**: 
- Add phone numbers to admin user profiles
- Ensure phones include country code (+1234567890)
- Check admin users are marked as `is_staff=True`

#### **3. "Twilio library not installed"**
**Solution**: `pip install twilio`

#### **4. "Invalid phone number format"**
**Solution**: 
- Include country code: +1234567890
- Remove spaces and special characters
- Set correct `DEFAULT_COUNTRY_CODE`

#### **5. "Message sending failed"**
**Solutions**:
- Verify Twilio credentials
- Check account balance
- Ensure phone numbers are verified
- For sandbox: Join the sandbox first

---

## 💰 **Cost Estimation**

### **Twilio Pricing (US)**
- WhatsApp messages: ~$0.005 per message
- SMS fallback: ~$0.0075 per message
- Monthly: 1000 notifications = ~$5

### **MessageBird Pricing**
- WhatsApp messages: ~$0.05 per message
- Bulk discounts available

### **WhatsApp Business API**
- Varies by region and volume
- Contact Meta for enterprise pricing

---

## 🎯 **Production Checklist**

### **Before Going Live:**
- [ ] Choose production WhatsApp service
- [ ] Set up verified business phone number
- [ ] Configure production environment variables
- [ ] Test with real phone numbers
- [ ] Set up monitoring and alerting
- [ ] Train staff on WhatsApp notifications

### **Security Considerations:**
- [ ] Store credentials in environment variables
- [ ] Use HTTPS for all API calls
- [ ] Implement rate limiting
- [ ] Monitor for spam/abuse
- [ ] Comply with WhatsApp Business policies

---

## 📈 **Advanced Features**

### **Future Enhancements You Can Add:**
1. **Message Templates**: Pre-designed messages for different events
2. **Rich Media**: Send images, documents, location
3. **Two-way Communication**: Allow members to reply
4. **Chatbot Integration**: Automated responses
5. **Bulk Messaging**: Send to multiple members
6. **Analytics**: Track delivery and engagement rates

---

## 📞 **Support**

**If you need help:**
1. Check troubleshooting section above
2. Test with Django shell commands
3. Review Twilio/MessageBird documentation
4. Check server logs for detailed errors

**Your WhatsApp notification system is ready! 🚀📱**

**Next Steps:**
1. Choose your WhatsApp service provider
2. Configure environment variables
3. Test with admin panel
4. Go live with dual-channel notifications!
