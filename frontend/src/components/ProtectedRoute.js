import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  // Role-based access
  if (roles && roles.length > 0) {
    const allowed = roles.includes(user.role) || (user.permissions && user.permissions.includes('all'));
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
