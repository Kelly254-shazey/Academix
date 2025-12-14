# Render.com Backend Deployment Guide

**Application**: Academix Attendance Management  
**Backend Framework**: Node.js + Express  
**Database**: MySQL  
**Status**: Ready for Deployment  

---

## Prerequisites

Before deploying to Render, you'll need:

1. **Render Account** - Sign up at [render.com](https://render.com)
2. **GitHub Account** - Your code must be on GitHub
3. **Database** - MySQL hosting (Render doesn't provide MySQL, use external service)
4. **Environment Variables** - Secure credentials for production

---

## Step-by-Step Deployment Guide

### Step 1: Prepare Your GitHub Repository

```bash
# Make sure all changes are committed
cd c:\Users\w\Academix
git status
git add .
git commit -m "prepare: backend deployment configuration"
git push origin main
```

✅ Your repo is already on GitHub at: `https://github.com/Kelly254-shazey/Academix.git`

---

### Step 2: Set Up MySQL Database (External Service)

You need to set up MySQL hosting. Choose one:

**Option A: Render.com + ClearDB (Recommended)**
1. Create ClearDB account: https://www.cleardb.com/
2. Create a MySQL database
3. Get connection details:
   - DB_HOST
   - DB_USER
   - DB_PASSWORD
   - DB_NAME

**Option B: AWS RDS**
1. Create RDS MySQL instance
2. Configure security groups
3. Get connection endpoint and credentials

**Option C: DigitalOcean Managed Database**
1. Create MySQL managed database
2. Get connection string
3. Extract credentials

**Option D: Your Own Server**
If you have MySQL running on your server:
1. Ensure it's accessible from Render IP
2. Update firewall rules
3. Get IP, port, and credentials

---

### Step 3: Deploy to Render

#### Method 1: Using render.yaml (Recommended)

1. **Login to Render.com**
   - Go to https://dashboard.render.com
   - Click "New"
   - Select "Web Service"

2. **Connect GitHub Repository**
   - Click "Connect a repository"
   - Select "Kelly254-shazey/Academix"
   - Authorize Render to access GitHub

3. **Configure Service**
   - Name: `academix-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: **Free** (or Paid for production)

4. **Add Environment Variables**
   - Click "Advanced" → "Environment"
   - Add all variables from `.env.example`:

```
NODE_ENV=production
PORT=5002
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=class_ai_db
DB_PORT=3306
JWT_SECRET=your_secure_jwt_secret_here
FRONTEND_URL=https://your-frontend-domain.com
QR_EXPIRY_SECONDS=300
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy your service URL (e.g., `https://academix-backend.onrender.com`)

#### Method 2: Manual Configuration

If not using render.yaml:

1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Enter repository URL manually
4. Configure as per Step 3 above

---

### Step 4: Update Frontend Environment Variables

After backend is deployed, update frontend `.env`:

```bash
# frontend/.env
REACT_APP_API_URL=https://academix-backend.onrender.com
REACT_APP_SOCKET_URL=https://academix-backend.onrender.com
```

Then redeploy frontend.

---

## Environment Variables Reference

### Required Variables

```env
# Server Configuration
NODE_ENV=production
PORT=5002

# Database
DB_HOST=your-cleardb-hostname.cleardb.com
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=class_ai_db

# Security
JWT_SECRET=your_very_long_random_secret_key_here_minimum_64_chars
BCRYPT_ROUNDS=12

# Frontend
FRONTEND_URL=https://your-frontend-domain.com

# QR Settings
QR_EXPIRY_SECONDS=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional Variables

```env
# Email Services
SENDGRID_API_KEY=your_sendgrid_key
MAILGUN_API_KEY=your_mailgun_key

# Redis (optional, for caching)
REDIS_URL=redis://your-redis-url:6379
```

---

## Troubleshooting

### Issue 1: Build Failed - "npm: command not found"
**Solution**: Ensure Node version is compatible
```yaml
# In render.yaml
nodeVersion: 18.0.0
```

### Issue 2: Database Connection Failed
**Solution**: 
- Verify DB credentials are correct
- Check firewall allows Render IPs
- Ensure database exists: `class_ai_db`
- Run migrations if needed

**Test connection**:
```bash
# SSH into Render service and test
mysql -h your-host -u user -p database_name
```

### Issue 3: Port Already in Use
**Solution**: Render assigns ports automatically. Ensure:
```javascript
// In server.js
const PORT = process.env.PORT || 5002;
```

### Issue 4: Logs Show Connection Errors
**Solution**: 
- Check Render dashboard → Logs tab
- Verify all env variables are set
- Ensure database is running
- Check database IP whitelist

---

## Verification Checklist

After deployment:

- [ ] Backend deployed successfully on Render
- [ ] Service URL obtained (e.g., `https://academix-backend.onrender.com`)
- [ ] Database connected and accessible
- [ ] API endpoints responding (test with curl or Postman)
- [ ] Frontend updated with correct API URL
- [ ] Authentication working (JWT tokens issued)
- [ ] Database queries executing properly
- [ ] No error logs in Render dashboard
- [ ] Performance acceptable (< 1 second response times)

---

## Testing Deployment

### Test 1: Health Check
```bash
curl https://academix-backend.onrender.com/health
# Expected: 200 OK
```

### Test 2: Authentication
```bash
curl -X POST https://academix-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Expected: JWT token in response
```

### Test 3: Admin Overview
```bash
curl https://academix-backend.onrender.com/api/admin/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Admin stats data
```

### Test 4: Database Query
```bash
curl https://academix-backend.onrender.com/api/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: List of users from database
```

---

## Performance Optimization

### For Production (Paid Plan)
1. Use Professional or Standard plan for better performance
2. Enable "Keep Alive" to prevent cold starts
3. Set up monitoring and alerts
4. Enable auto-scaling if needed

### Database Optimization
1. Add database indexes (see DATABASE_FETCHING_ANALYSIS.md)
2. Enable connection pooling
3. Use read replicas for scaling

### Caching Strategy
1. Implement Redis caching
2. Cache frequently accessed data
3. Set appropriate TTLs

---

## Monitoring & Logs

### View Logs
1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. Filter by severity (error, warning, info)

### Monitor Performance
1. Check response times in logs
2. Monitor database query times
3. Track error rates
4. Watch for memory leaks

---

## Rollback Procedure

If something goes wrong:

1. **Via Render Dashboard**:
   - Go to Deployments tab
   - Click previous successful deployment
   - Click "Deploy"

2. **Via Git**:
   ```bash
   git revert HEAD
   git push origin main
   # Render will auto-redeploy
   ```

---

## Cost Analysis

### Render Pricing
- **Free Tier**: Limited to 0.5 CPU, 512MB RAM (cold starts)
- **Starter**: $7/month (1 CPU, 512MB RAM)
- **Standard**: $12/month+ (more resources)
- **Professional**: $99/month (production grade)

### Recommendation for Production
- Use **Standard** or **Professional** plan
- Add **ClearDB MySQL** (~$10-15/month)
- Total: ~$20-40/month for production

---

## Continuous Deployment

Render automatically deploys when you push to GitHub:

1. Push code to main branch
   ```bash
   git push origin main
   ```

2. Render automatically:
   - Detects changes
   - Builds your service
   - Runs `npm install`
   - Starts with `npm start`
   - Routes traffic to new version

3. Check deployment status in Render dashboard

---

## Security Checklist

- [ ] Environment variables never committed to Git
- [ ] JWT secret is strong (64+ characters)
- [ ] Database password is secure
- [ ] CORS configured for your domain only
- [ ] Rate limiting enabled
- [ ] Helmet middleware enabled
- [ ] HTTPS enforced
- [ ] API authentication required for sensitive endpoints
- [ ] Database user has minimal required permissions
- [ ] Backups configured

---

## Next Steps After Deployment

1. **Test All Endpoints**
   - Admin dashboard
   - Lecturer functionality
   - Student features
   - Authentication

2. **Monitor Performance**
   - Watch logs for errors
   - Monitor response times
   - Check database performance

3. **Scale If Needed**
   - Upgrade Render plan if needed
   - Optimize database queries
   - Implement caching

4. **Set Up Monitoring**
   - Add error tracking (Sentry)
   - Set up performance monitoring
   - Configure uptime checks

---

## Useful Links

- **Render Documentation**: https://render.com/docs
- **Node.js Deployment**: https://render.com/docs/deploy-node
- **Environment Variables**: https://render.com/docs/environment-variables
- **ClearDB MySQL**: https://www.cleardb.com/
- **MySQL Documentation**: https://dev.mysql.com/doc/

---

## Support

If you encounter issues:

1. **Check Render Logs** - Most errors are logged there
2. **Review render.yaml** - Ensure correct configuration
3. **Verify Env Variables** - All required variables must be set
4. **Test Database Connection** - Ensure MySQL is accessible
5. **Contact Render Support** - For platform-specific issues

---

## Summary

**To Deploy Your Backend to Render**:

1. ✅ Push code to GitHub (already done)
2. ✅ Prepare render.yaml (created)
3. Create MySQL database (ClearDB or other)
4. Connect GitHub to Render dashboard
5. Configure environment variables
6. Deploy web service
7. Test all endpoints
8. Update frontend environment variables
9. Monitor logs and performance

**Expected Result**: Your backend will be live and accessible at a Render URL within 5-10 minutes!

---

**Status**: Ready for Deployment  
**Created**: 2025-12-14  
**Backend Version**: 1.0.0  
**Node Version**: 18+
