import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Messages from './pages/Messages';
import Attendance from './pages/Attendance';
import QRScanner from './pages/QRScanner';
import NotificationPortal from './pages/NotificationPortal';
import AdminDashboard from './pages/AdminDashboard';
import AdminMessaging from './pages/AdminMessaging';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import StudentPortal from './portals/StudentPortal';
import LecturerPortal from './portals/LecturerPortal';
import AdminPortal from './portals/AdminPortal';
import StudentDashboard from './pages/student/Dashboard';
import LecturerDashboard from './pages/lecturer/Dashboard';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [unreadMessages, setUnreadMessages] = React.useState(3);

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
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr-scanner"
          element={
            <ProtectedRoute roles={["student"]}>
              <QRScanner />
            </ProtectedRoute>
          }
        />
        <Route path="/portal">
          <Route path="student" element={<ProtectedRoute roles={["student"]}><StudentPortal /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="attendance" element={<ProtectedRoute roles={["student"]}><Attendance user={user} /></ProtectedRoute>} />
              <Route path="messages" element={<ProtectedRoute roles={["student"]}><Messages user={user} setUnreadMessages={() => {}} /></ProtectedRoute>} />
            </Route>

            <Route path="lecturer" element={<ProtectedRoute roles={["lecturer"]}><LecturerPortal /></ProtectedRoute>}>
              <Route index element={<LecturerDashboard />} />
              <Route path="messages" element={<ProtectedRoute roles={["lecturer"]}><Messages user={user} setUnreadMessages={() => {}} /></ProtectedRoute>} />
            </Route>

            <Route path="admin" element={<ProtectedRoute roles={["admin","hod","superadmin"]}><AdminPortal /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="messages" element={<ProtectedRoute roles={["admin","hod","superadmin"]}><AdminMessaging /></ProtectedRoute>} />
            </Route>
          </Route>

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

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to={user ? "/portal/student" : "/login"} />} />
        </Routes>
      </main>
    );
  }

  function App() {
    const qc = new QueryClient();
    return (
      <ErrorBoundary>
        <Router>
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
