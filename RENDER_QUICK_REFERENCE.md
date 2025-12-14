# Render Deployment Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Prepare Database
```
Go to cleardb.com or your MySQL provider:
- Create database: class_ai_db
- Get credentials (host, user, password, port)
- Save these - you'll need them soon
```

### 2. Go to Render.com
```
1. Sign in to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect GitHub repository "Kelly254-shazey/Academix"
4. Authorize access when prompted
```

### 3. Configure Service
```
Name:           academix-backend
Environment:    Node
Region:         Choose closest to you
Plan:           Free (or Paid for production)
Build Command:  cd backend && npm install
Start Command:  cd backend && npm start
```

### 4. Add Environment Variables
```
Copy-paste these and replace with YOUR values:

NODE_ENV=production
PORT=5002
DB_HOST=your_mysql_hostname_here
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=class_ai_db
JWT_SECRET=generate_strong_secret_minimum_64_characters
FRONTEND_URL=https://your-frontend-url.com
QR_EXPIRY_SECONDS=300
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Deploy
```
Click "Create Web Service"
Wait 5-10 minutes
Your backend will be live!
```

---

## 📋 Environment Variables Explained

| Variable | Example | Purpose |
|----------|---------|---------|
| NODE_ENV | production | Node environment |
| PORT | 5002 | Server port |
| DB_HOST | mysql.cleardb.com | Database hostname |
| DB_USER | user123 | Database username |
| DB_PASSWORD | secure_pass | Database password |
| DB_NAME | class_ai_db | Database name |
| JWT_SECRET | abc123... | For JWT tokens |
| FRONTEND_URL | https://yourdomain.com | Your frontend domain |

---

## 🔗 Your Backend URL

Once deployed, you'll get a URL like:
```
https://academix-backend.onrender.com
```

Update your frontend `.env`:
```
REACT_APP_API_URL=https://academix-backend.onrender.com
REACT_APP_SOCKET_URL=https://academix-backend.onrender.com
```

---

## ✅ Verify Deployment

After deployment, test these:

```bash
# Test 1: Admin Overview
curl https://academix-backend.onrender.com/api/admin/overview \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Get Users
curl https://academix-backend.onrender.com/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 3: Login
curl -X POST https://academix-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## 📊 Database Options (Cheapest to Most Reliable)

### Option 1: ClearDB (Free/$10)
- Website: cleardb.com
- Pros: Free tier available, easy setup
- Cons: Limited storage on free tier
- Recommended: YES for development

### Option 2: AWS RDS (Free tier)
- Website: aws.amazon.com/rds
- Pros: Reliable, scalable, free tier
- Cons: Complex setup, many options
- Recommended: YES for production

### Option 3: DigitalOcean ($12+)
- Website: digitalocean.com
- Pros: Simple, affordable, good support
- Cons: Minimum cost
- Recommended: YES for production

### Option 4: Your Own Server
- Setup: MySQL on your server
- Pros: Full control, no monthly cost
- Cons: You manage everything
- Recommended: NO unless experienced

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution**: 
1. Check DB_HOST is correct
2. Verify DB_USER and DB_PASSWORD
3. Ensure database exists (class_ai_db)
4. Check firewall allows Render IPs

### Issue: "Port already in use"
**Solution**:
- Render assigns ports automatically
- This shouldn't happen on Render
- Check logs for other errors

### Issue: "Module not found"
**Solution**:
1. Check package.json has all dependencies
2. Ensure npm install succeeds
3. Check node_modules is in .gitignore (it should be)

### Issue: "Build failed"
**Solution**:
1. Check build command is correct: `cd backend && npm install`
2. Check start command is correct: `cd backend && npm start`
3. View Render logs for specific error

---

## 🔐 Security Best Practices

- ✅ Never commit .env to Git
- ✅ Use strong JWT_SECRET (64+ chars)
- ✅ Use strong DB_PASSWORD (mix of numbers, letters, symbols)
- ✅ Don't share credentials in messages
- ✅ Enable HTTPS (Render does this automatically)
- ✅ Set CORS to your frontend domain only
- ✅ Regular backups of database

---

## 📈 Next Steps After Deployment

1. **Test All Endpoints** - Make sure everything works
2. **Monitor Logs** - Check for errors
3. **Load Test** - Simulate traffic to check performance
4. **Optimize Database** - Add indexes (see DATABASE_FETCHING_ANALYSIS.md)
5. **Setup Monitoring** - Use Sentry or similar
6. **Deploy Frontend** - Update with new API URL

---

## 💡 Pro Tips

1. **Auto-Redeploy**: Push to main branch = automatic redeploy
2. **View Logs**: Render Dashboard → Service → Logs
3. **Check Status**: Render Dashboard → Service → Overview
4. **Rollback**: Deployments tab → select previous version → Deploy
5. **Custom Domain**: Add after initial deployment

---

## 📞 Need Help?

1. **Render Support**: https://render.com/docs
2. **Express.js Docs**: https://expressjs.com
3. **MySQL Docs**: https://dev.mysql.com
4. **Check Logs**: Most errors are logged by Render

---

## ⏱️ Deployment Timeline

- Preparation: 5 minutes
- Database setup: 5-10 minutes
- Render configuration: 5 minutes
- First deployment: 5-10 minutes
- Verification: 5 minutes
- **Total: ~30 minutes**

---

## 🎯 Success Indicators

✅ Backend deployed on Render  
✅ Database connected  
✅ API endpoints responding  
✅ Authentication working  
✅ No error logs  
✅ Response times < 1 second  
✅ Frontend can communicate with backend  

**When you see all these: YOU'RE DONE! 🎉**

---

**Status**: Ready to Deploy  
**Estimated Time**: 30 minutes  
**Difficulty**: Easy (follow steps above)
