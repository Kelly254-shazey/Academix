import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import useSessionTimeout from './hooks/useSessionTimeout';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import './styles/App.css';

/**
 * Main App Component
 * Handles routing and authentication flow
 * Features: Session timeout after 30 minutes of inactivity
 */
function App() {
  // Auto-logout after 30 minutes of inactivity
  useSessionTimeout(30);

  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Navbar />
          <main className="app-main">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/lecturer/dashboard"
                element={
                  <ProtectedRoute requiredRole="lecturer">
                    <LecturerDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Redirect to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
