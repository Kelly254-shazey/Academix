# ClassTrack AI Development TODO

## 1. Project Structure Setup
- [x] Create root directories: backend, frontend, ai-engine, database, docs, config

## 2. Backend Setup (Node.js + Express)
- [x] Create backend/package.json with dependencies
- [x] Implement backend/server.js with middleware
- [x] Create backend/routes/ for auth, classes, attendance, dashboard, ai
- [x] Implement backend/services/ (authService, qrService, etc.)
- [x] Add backend/models/ for database interactions
- [x] Include sample request/response JSON in routes

## 3. Database Setup (PostgreSQL)
- [x] Create database/schema.sql with tables: users, classes, class_sessions, attendance_logs, notifications, ai_predictions

## 4. Frontend Setup (React + Tailwind + Redux/RTK Query)
- [x] Initialize React app in frontend/
- [x] Set up Tailwind CSS, Redux Toolkit, RTK Query
- [x] Create shared components (Login, Dashboard, Notifications)
- [x] Implement Student pages: Today's Classes, QR Scanner, History
- [x] Implement Lecturer pages: Courses, Start Session, Status
- [x] Implement Admin pages: Monitoring, Reports
- [x] Add PWA configuration (service worker, manifest.json)
- [x] Integrate Web Push API

## 5. AI Engine (Python)
- [x] Create ai-engine/ scripts for absenteeism prediction, punctuality scoring, anomaly detection
- [x] Use scikit-learn, pandas

## 6. Notifications Setup
- [x] Setup Web Push API in backend and frontend

## 7. Deployment Configuration
- [x] Create Dockerfile, docker-compose.yml
- [x] Create .env.example
- [x] Write deployment docs for Render

## 8. Testing and Integration
- [ ] Install dependencies (npm, pip)
- [ ] Set up PostgreSQL and run schema
- [ ] Run backend server locally
- [ ] Build and run frontend
- [ ] Test API endpoints
- [ ] Configure Redis and Web Push
- [ ] Full system integration test
