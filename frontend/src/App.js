import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import apiClient from './services/apiClient';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import StudentPortal from './portals/StudentPortal';
import LecturerPortal from './portals/LecturerPortal';
import AdminPortal from './portals/AdminPortal';
import './services/connectionManager'; // Initialize connection manager
import HealthCheck from './components/HealthCheck';

function AppContent() {
  const { user, isLoading, token, logout } = useAuth();

  // Initialize apiClient with token when it becomes available
  React.useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  // Map various role strings into a canonical portal group
  const getRoleGroup = (role) => {
    if (!role) return null;
    const r = String(role).toLowerCase();
    if (r.includes('student') || r.includes('learner') || r.includes('pupil')) return 'student';
    if (r.includes('lecturer') || r.includes('teacher') || r.includes('instructor')) return 'lecturer';
    if (r.includes('admin') || r.includes('hod') || r.includes('super') || r.includes('manager')) return 'admin';
    return null;
  };

  const RoleRedirect = () => {
    const group = getRoleGroup(user?.role);
    if (!group) {
      // Default to student portal when role is not explicitly recognized
      return <Navigate to={`/portal/student`} replace />;
    }
    return <Navigate to={`/portal/${group}`} replace />;
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className={user ? "main-content" : ""}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUp />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            user ? (
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Portal Routes */}
        <Route path="/portal/student/*" element={<ProtectedRoute roles={["student"]}><StudentPortal user={user} token={token} onLogout={logout} /></ProtectedRoute>} />
        <Route path="/portal/lecturer/*" element={<ProtectedRoute roles={["lecturer"]}><LecturerPortal user={user} token={token} onLogout={logout} /></ProtectedRoute>} />
        <Route path="/portal/admin/*" element={<ProtectedRoute roles={["admin","hod","superadmin"]}><AdminPortal user={user} token={token} onLogout={logout} /></ProtectedRoute>} />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
      
      {/* Health Check in Development (disabled) */}
      {false && process.env.REACT_APP_DEBUG_MODE === 'true' && <HealthCheck />}
    </main>
  );
  }

  function App() {
    const qc = new QueryClient();
    return (
      <ErrorBoundary>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <NotificationProvider>
              <QueryClientProvider client={qc}>
                <AppContent />
              </QueryClientProvider>
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    );
  }

  export default App;
