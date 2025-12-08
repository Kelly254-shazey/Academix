# ClassTrack AI Deployment Guide

## Overview
This guide covers deploying ClassTrack AI to Render.com, a cloud platform for web applications.

## Prerequisites
- Render.com account
- GitHub repository with the project code

## Deployment Steps

### 1. Database Setup
1. Create a PostgreSQL database on Render
2. Note the connection string (DATABASE_URL)

### 2. Redis Setup
1. Create a Redis instance on Render
2. Note the connection string (REDIS_URL)

### 3. Backend Deployment
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from .env.example
6. Deploy

### 4. Frontend Deployment
1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add REACT_APP_API_URL environment variable pointing to your backend
6. Deploy

### 5. Environment Variables
Ensure all required environment variables are set in Render:
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- QR_SECRET
- WEB_PUSH_VAPID_PUBLIC_KEY
- WEB_PUSH_VAPID_PRIVATE_KEY
- EMAIL_API_KEY

### 6. Database Migration
After deployment, run the database schema:
```sql
-- Execute the contents of database/schema.sql in your PostgreSQL database
```

### 7. Testing
1. Test user registration and login
2. Test class creation and session starting
3. Test QR code generation and scanning
4. Test attendance check-in
5. Test notifications and AI insights

## Troubleshooting
- Check Render logs for errors
- Ensure all environment variables are set correctly
- Verify database connectivity
- Test API endpoints using tools like Postman

## Scaling
- Monitor usage and scale Render services as needed
- Consider upgrading database plans for production use
