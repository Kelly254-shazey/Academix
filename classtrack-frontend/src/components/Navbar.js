/**
 * Navbar Component
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      onLogout();
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🎓 ClassTrack AI
        </Link>

        <div className="navbar-menu">
          <div className="navbar-items">
            {user?.role === 'student' && (
              <>
                <Link to="/student/dashboard" className="nav-link">
                  Dashboard
                </Link>
                <Link to="/student/qr-scanner" className="nav-link">
                  Check In
                </Link>
                <Link to="/student/attendance-history" className="nav-link">
                  History
                </Link>
              </>
            )}

            {user?.role === 'lecturer' && (
              <>
                <Link to="/lecturer/dashboard" className="nav-link">
                  Dashboard
                </Link>
                <Link to="/lecturer/classes" className="nav-link">
                  Classes
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className="nav-link">
                  Dashboard
                </Link>
              </>
            )}
          </div>

          <div className="navbar-user">
            <span className="user-name">{user?.name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
