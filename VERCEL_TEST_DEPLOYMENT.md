# Vercel Test Deployment Guide

## 🧪 Testing Socket.IO Meeting Reminders on Vercel

**⚠️ Important: This is for TESTING ONLY. Not suitable for production due to polling delays.**

## 🚀 Quick Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy from Project Root
```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → hb-institution-test
- **Directory?** → ./
- **Override settings?** → No

### 4. Set Environment Variables
```bash
vercel env add NODE_ENV
# Enter: production

vercel env add JWT_SECRET
# Enter: your_jwt_secret_here

vercel env add MONGODB_URI
# Enter: your_mongodb_connection_string

vercel env add FRONTEND_URL
# Enter: *
```

### 5. Redeploy with Environment Variables
```bash
vercel --prod
```

## 🧪 Testing Your Deployment

### 1. Get Your Vercel URL
After deployment, you'll get a URL like:
```
https://hb-institution-test.vercel.app
```

### 2. Test the API
Visit: `https://your-app.vercel.app/api/v1/health`

Should return:
```json
{
  "success": true,
  "message": "HB-Institution Platform API is running!",
  "environment": "production"
}
```

### 3. Test Socket.IO Connection
Visit: `https://your-app.vercel.app/test-socket.html`

1. Enter your JWT token
2. Click "Connect to Vercel"
3. Check connection status
4. Enter a meeting ID
5. Click "Send Test Reminder"
6. Watch for delayed notifications (3-5 seconds)

## 📊 What to Expect

### ✅ What Works:
- API endpoints
- Database connections
- Authentication
- Socket.IO connection (with delays)
- Meeting reminder notifications (delayed)

### ⚠️ What to Expect:
- **3-5 second delays** for notifications
- **Connection drops** after periods of inactivity
- **Inconsistent behavior** during high traffic
- **Polling mode only** (no WebSockets)

### ❌ What Might Not Work:
- Persistent connections
- Instant real-time notifications
- High-frequency updates
- Connection stability under load

## 🔧 Testing Endpoints

### Health Check
```
GET https://your-app.vercel.app/api/v1/health
```

### Authentication Test
```
POST https://your-app.vercel.app/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password"
}
```

### Test Meeting Reminder
```
POST https://your-app.vercel.app/api/v1/notifications/test-reminder/MEETING_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📱 Frontend Testing

### Connect to Vercel Socket.IO:
```javascript
const socket = io('https://your-app.vercel.app', {
  transports: ['polling'], // Important: Only polling for Vercel
  upgrade: false,
  timeout: 20000
});

socket.on('meeting_reminder', (reminder) => {
  console.log('Reminder received (with delay):', reminder);
});
```

## 🐛 Troubleshooting

### Connection Issues:
- Check browser console for errors
- Verify JWT token is valid
- Ensure CORS is configured correctly
- Try refreshing the page

### No Notifications:
- Check if meeting ID exists in database
- Verify user is enrolled in the meeting
- Check server logs in Vercel dashboard
- Wait 5-10 seconds (polling delay)

### Environment Variables:
```bash
# Check current environment variables
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME
```

## 📈 Monitoring

### Vercel Dashboard:
- Visit: https://vercel.com/dashboard
- Check function logs
- Monitor performance
- View deployment status

### Console Logs:
- Browser: F12 → Console
- Server: Vercel Dashboard → Functions → Logs

## 🎯 Success Criteria

Your Vercel test deployment is successful if:

1. ✅ Health endpoint returns 200
2. ✅ Socket.IO connection establishes
3. ✅ Authentication works
4. ✅ Test reminder endpoint works
5. ✅ Meeting reminders appear (with delay)
6. ✅ Browser notifications show

## 🚀 Next Steps

After successful Vercel testing:

1. **For Production**: Deploy to Render/Railway for real-time performance
2. **For Frontend**: Use the Vercel URL to test React integration
3. **For Demo**: Share Vercel URL for stakeholder testing

## 📝 Notes

- **Polling Delay**: 3-5 seconds is normal on Vercel
- **Connection Drops**: Expected behavior on serverless
- **Testing Only**: Not suitable for real users
- **Production**: Use Render/Railway for actual deployment

Your Socket.IO meeting reminders are now testable on Vercel! 🎉
