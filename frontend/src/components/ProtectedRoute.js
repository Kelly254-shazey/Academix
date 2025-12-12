import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getRoleGroup = (role) => {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r.includes('student') || r.includes('learner') || r.includes('pupil')) return 'student';
  if (r.includes('lecturer') || r.includes('teacher') || r.includes('instructor')) return 'lecturer';
  if (r.includes('admin') || r.includes('hod') || r.includes('super') || r.includes('manager')) return 'admin';
  return null;
};

const ProtectedRoute = ({ children, roles = [], permission }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access: accept exact role OR canonical role group
  if (roles && roles.length > 0) {
    const group = getRoleGroup(user.role);
    const allowed = roles.includes(user.role) || (group && roles.includes(group)) || (user.permissions && user.permissions.includes('all'));
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  // Permission-based access
  if (permission) {
    const hasPerm = user.permissions && (user.permissions.includes(permission) || user.permissions.includes('all'));
    if (!hasPerm) return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
