import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Attendance from './pages/Attendance';
import Profile from './pages/Profile';
import QRScanner from './pages/QRScanner';
import QRGenerator from './pages/QRGenerator';
import NotificationPortal from './pages/NotificationPortal';
import NotificationCenter from './pages/NotificationCenter';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import MissedLectureForm from './pages/MissedLectureForm';
import AttendanceAnalysis from './pages/AttendanceAnalysis';
import AdminMessaging from './pages/AdminMessaging';
import DataManagement from './pages/DataManagement';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [unreadMessages, setUnreadMessages] = React.useState(3);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar user={user} unreadMessages={unreadMessages} />}
      <main className={user ? "main-content" : ""}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUp />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-scanner"
            element={
              <ProtectedRoute>
                <QRScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-generator"
            element={
              <ProtectedRoute>
                <QRGenerator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages user={user} setUnreadMessages={setUnreadMessages} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notification-portal"
            element={
              <ProtectedRoute>
                <NotificationPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/missed-lectures"
            element={
              <ProtectedRoute>
                <MissedLectureForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-analysis"
            element={
              <ProtectedRoute>
                <AttendanceAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-messaging"
            element={
              <ProtectedRoute>
                <AdminMessaging />
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-management"
            element={
              <ProtectedRoute>
                <DataManagement />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
