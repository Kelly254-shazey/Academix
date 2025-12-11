/**
 * Navbar Component
 * Responsive navigation with logout menu
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoutModal from './LogoutModal';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);

  // Keyboard shortcut for logout (Alt+L)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setShowLogoutModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('fingerprint');
      onLogout();
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            🎓 ClassTrack AI
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navigation Items */}
          <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <div className="navbar-items">
              {user?.role === 'student' && (
                <>
                  <Link to="/student/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    📊 Dashboard
                  </Link>
                  <Link to="/student/qr-scanner" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    📱 Check In
                  </Link>
                  <Link to="/student/attendance-history" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    📋 History
                  </Link>
                </>
              )}

              {user?.role === 'lecturer' && (
                <>
                  <Link to="/lecturer/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    📊 Dashboard
                  </Link>
                  <Link to="/lecturer/classes" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    📚 Classes
                  </Link>
                </>
              )}

              {user?.role === 'admin' && (
                <>
                  <Link to="/admin/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                    ⚙️ Dashboard
                  </Link>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="navbar-user" ref={userMenuRef}>
              <button
                className="user-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User menu"
              >
                <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <span className="user-name-small">{user?.name}</span>
                <svg className="menu-arrow" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <p className="user-full-name">{user?.name}</p>
                      <p className="user-email">{user?.email}</p>
                      <p className="user-role">{user?.role}</p>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item" onClick={() => navigate('/profile')}>
                    👤 Profile
                  </button>
                  <button className="dropdown-item" onClick={() => navigate('/settings')}>
                    ⚙️ Settings
                  </button>

                  <div className="dropdown-divider"></div>

                  <button
                    className="dropdown-item logout-item"
                    onClick={() => {
                      setShowLogoutModal(true);
                      setUserMenuOpen(false);
                    }}
                  >
                    🚪 Logout
                    <span className="shortcut-hint">Alt+L</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default Navbar;
