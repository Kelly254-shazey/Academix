import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../styles/Navbar.css';

/**
 * Navigation Bar Component
 * Displays navigation links and user menu
 * Features: User menu, notifications, logout with confirmation
 * Keyboard Shortcut: Alt+L to logout
 */
const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Handle logout with confirmation
  const handleLogout = async () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true);
      return;
    }
    
    try {
      await logout();
      setShowMenu(false);
      setShowLogoutConfirm(false);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Force logout anyway
      navigate('/login');
    }
  };

  // Confirm logout
  const confirmLogout = () => {
    handleLogout();
  };

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Keyboard shortcut: Alt+L for logout
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.altKey && e.key === 'l' && isAuthenticated && showMenu) {
        e.preventDefault();
        handleLogout();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAuthenticated, showMenu, showLogoutConfirm]);

  if (!isAuthenticated) {
    return null;
  }

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'student':
        return '/student/dashboard';
      case 'lecturer':
        return '/lecturer/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={getDashboardPath()} className="navbar-brand">
          🎓 Attendance System
        </Link>

        <div className="navbar-content">
          <div className="navbar-links">
            <Link to={getDashboardPath()} className="nav-link">
              Dashboard
            </Link>

            {user?.role === 'student' && (
              <>
                <Link to="/student/attendance" className="nav-link">
                  My Attendance
                </Link>
              </>
            )}

            {user?.role === 'lecturer' && (
              <>
                <Link to="/lecturer/analytics" className="nav-link">
                  Analytics
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin/users" className="nav-link">
                  Users
                </Link>
                <Link to="/admin/reports" className="nav-link">
                  Reports
                </Link>
              </>
            )}
          </div>

          <div className="navbar-right">
            {/* Notifications Badge */}
            <div className="notification-badge">
              <span>🔔</span>
              {unreadCount > 0 && <span className="count">{unreadCount}</span>}
            </div>

            {/* User Menu */}
            <div className="user-menu">
              <button
                className="user-button"
                onClick={() => setShowMenu(!showMenu)}
              >
                👤 {user?.first_name}
              </button>

              {showMenu && (
                <div className="menu-dropdown">
                  <div className="menu-item">
                    <strong>{user?.email}</strong>
                    <small>{user?.role}</small>
                  </div>
                  <hr />
                  
                  {!showLogoutConfirm ? (
                    <button onClick={handleLogout} className="menu-link logout">
                      🚪 Logout (Alt+L)
                    </button>
                  ) : (
                    <div className="logout-confirmation">
                      <p>Are you sure you want to logout?</p>
                      <div className="confirmation-buttons">
                        <button onClick={confirmLogout} className="confirm-btn">
                          Yes, Logout
                        </button>
                        <button onClick={cancelLogout} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
