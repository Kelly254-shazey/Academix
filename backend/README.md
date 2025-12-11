# Backend README

Quick notes to run the backend locally and wire it to a MySQL database.

1) Copy `.env.example` to `.env` and fill in real credentials (DO NOT commit `.env`).

```powershell
cd backend
copy .env.example .env
# then edit .env to set DB_USER/DB_PASSWORD/DB_HOST etc.
```

2) Install dependencies and start server

```powershell
npm install
npm run dev   # requires nodemon
# or
npm start
```

3) Create the MySQL database and import schema

Use the provided MySQL-compatible schema at `database/schema.mysql.sql`.

```powershell
# create database 'class' if not exists (adjust user and password)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS class CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p class < ..\database\schema.mysql.sql
```

4) Routes of interest for testing
- `GET /classes` — list classes
- `POST /classes` — create class
- `POST /classes/:classId/sessions` — create a session (include `qr_signature` optionally)
- `POST /classes/:classId/sessions/:sessionId/scan` — record a QR scan

5) Security
- The current implementation expects an open POST to the scan endpoint for testing. Add authentication (JWT) and server-side validation before using in production.
