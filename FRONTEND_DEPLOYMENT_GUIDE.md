# ClassTrack AI - Frontend Deployment Guide

## 📋 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend API running on http://localhost:5002

### Local Development

```bash
cd frontend
npm install
npm start
```

Frontend will run on `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

---

## 🌍 Environment Variables

Create `.env.local` in the `frontend/` directory:

```env
REACT_APP_API_URL=http://your-backend-url:5002
REACT_APP_ENV=production
```

**For Docker:**
Set environment variables when building or running:
```bash
docker build --build-arg REACT_APP_API_URL=http://backend:5002 .
```

---

## 🐳 Docker Deployment

### Build Image
```bash
cd frontend
docker build -t classtrack-frontend:latest .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_URL=http://backend:5002 \
  classtrack-frontend:latest
```

### With Docker Compose
See `docker-compose.yml` in root for full stack deployment.

---

## 🚀 Production Deployment

### Vercel (Recommended for React)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables in Vercel dashboard:
- `REACT_APP_API_URL` → Your backend API URL

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

Create `netlify.toml`:
```toml
[build]
command = "npm run build"
publish = "build"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

### GitHub Pages

Update `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/repo-name"
}
```

Deploy:
```bash
npm run build
npm run deploy
```

### AWS S3 + CloudFront

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync build/ s3://your-bucket-name

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Render

1. Connect GitHub repo to Render
2. Create new "Static Site"
3. Build command: `npm run build`
4. Publish directory: `build`
5. Add environment variables

---

## 📦 Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── axiosConfig.js         # API client config
│   ├── components/
│   │   ├── Navbar.js
│   │   ├── ProtectedRoute.js
│   │   └── QRScanner.js
│   ├── context/
│   │   ├── AuthContext.js          # Auth state management
│   │   └── NotificationContext.js
│   ├── pages/
│   │   ├── Login.js                # Authentication pages
│   │   ├── SignUp.js
│   │   ├── Dashboard.js            # Main app pages
│   │   ├── AdminDashboard.js
│   │   ├── Attendance.js
│   │   ├── QRScanner.js
│   │   └── ...
│   ├── App.js                      # Main component
│   ├── App.css
│   ├── index.js                    # Entry point
│   └── index.css
├── .env.example
├── package.json
├── Dockerfile
└── README.md
```

---

## 🔌 API Integration

All API calls use the `api` instance from `axiosConfig.js`:

```javascript
import api from '../api/axiosConfig';

// GET
api.get('/classes').then(res => console.log(res.data));

// POST
api.post('/auth/login', { email, password }).then(res => console.log(res.data));

// JWT automatically added to headers via interceptor
```

---

## 🔒 Security

1. **Never commit `.env` files** with real credentials
2. **JWT tokens** stored in localStorage (can be moved to httpOnly cookies for better security)
3. **CORS** configured on backend for frontend origin
4. **API URL** uses environment variables, not hardcoded

---

## 🧪 Testing

```bash
# Run tests (if Jest is configured)
npm test

# Run with coverage
npm test -- --coverage

# Build test
npm run build
```

---

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
Ensure backend has correct `FRONTEND_URL` in `.env`

### API calls failing
1. Check `REACT_APP_API_URL` in `.env.local`
2. Verify backend is running
3. Check browser console for errors

### Build failing
```bash
# Clear build cache
rm -rf build node_modules
npm install
npm run build
```

---

## 📈 Performance Optimization

### Code Splitting
React Router already implements automatic code splitting per route.

### Asset Optimization
```bash
# Analyze bundle
npm install --save-dev source-map-explorer
npm run build
npm run analyze
```

### Environment-specific builds
```json
{
  "scripts": {
    "build:dev": "REACT_APP_ENV=development react-scripts build",
    "build:prod": "REACT_APP_ENV=production react-scripts build"
  }
}
```

---

## 🚢 CI/CD Pipeline Example (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| REACT_APP_API_URL | http://localhost:5002 | Backend API URL |
| REACT_APP_ENV | development | Environment mode |

---

## ✅ Deployment Checklist

- [ ] Update API URL in `.env.local` to production backend
- [ ] Run `npm run build` and test build locally
- [ ] Set environment variables on hosting platform
- [ ] Enable auto-deployments from GitHub
- [ ] Set up custom domain / SSL certificate
- [ ] Configure CDN if using S3 + CloudFront
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure analytics (Google Analytics, Mixpanel)
- [ ] Test login, API calls, QR scanner on production
- [ ] Monitor performance and errors in production

---

## 📞 Support

For deployment issues:
1. Check `.env` configuration
2. Verify backend is accessible
3. Check browser console for errors
4. Review deployment logs on hosting platform
