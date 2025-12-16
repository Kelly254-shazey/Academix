# Academix Frontend

React-based frontend for the Academix attendance management system.

## Features

- **Multi-role Authentication**: Student, Lecturer, and Admin portals
- **Real-time Updates**: Socket.IO integration for live notifications
- **QR Code Scanning**: Attendance marking via QR codes
- **Offline Support**: Queue scans when offline, sync when online
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Export Functionality**: CSV/JSON export capabilities

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Backend server running on http://localhost:5002

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if needed to match your backend URL.

3. **Start development server:**
   ```bash
   npm start
   ```
   Or use the batch script: `start-frontend.bat`

The app will open at http://localhost:3000

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── pages/              # Main pages (Login, SignUp)
├── portals/            # Role-specific portals
├── services/           # API and external services
├── utils/              # Utility functions
└── App.js              # Main app component
```

## Key Components

### Portals
- **StudentPortal**: Dashboard, QR scanning, timetable, notifications
- **LecturerPortal**: QR generation, session management, reports
- **AdminPortal**: User management, analytics, communications

### Services
- **apiClient**: Centralized HTTP client for backend API
- **socketService**: Real-time WebSocket communication
- **offlineQueueService**: Offline scan queuing and sync

## Environment Variables

```bash
REACT_APP_BACKEND_URL=http://localhost:5002/api
REACT_APP_SOCKET_URL=http://localhost:5002
REACT_APP_DEBUG_MODE=true
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Authentication Flow

1. User logs in via `/login`
2. Backend returns JWT token and user data
3. Token stored in localStorage
4. User redirected to appropriate portal based on role
5. Socket.IO connection established for real-time updates

## Offline Support

The app supports offline QR scanning:
- Scans are queued locally when offline
- Automatic sync when connection restored
- Visual indicators for offline status
- Failed scans are retried with exponential backoff

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure backend is running on http://localhost:5002
   - Check REACT_APP_BACKEND_URL in .env

2. **Socket Connection Issues**
   - Verify REACT_APP_SOCKET_URL matches backend
   - Check browser console for WebSocket errors

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check for TypeScript errors in console

### Debug Mode

Set `REACT_APP_DEBUG_MODE=true` to enable:
- Detailed error messages
- Console logging
- Development tools

## Production Build

```bash
npm run build
```

Builds optimized production files in `build/` directory.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow existing code style
2. Add proper error handling
3. Include TypeScript types where applicable
4. Test on multiple devices/browsers