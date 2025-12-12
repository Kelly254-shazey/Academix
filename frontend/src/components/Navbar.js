import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Navbar.css';

function Navbar({ user, unreadMessages }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { getUnreadCount } = useNotifications();
  const unreadNotifications = getUnreadCount();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    logout();
    setShowMobileMenu(false);
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // Close menus on Escape for accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowMobileMenu(false);
        setShowDropdown(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">
            <span className="logo-icon">📚</span>
            <span className="logo-text">ClassTrack AI</span>
          </Link>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/')}`} aria-current={isActive('/') ? 'page' : undefined}>
              <span className="nav-icon">🏠</span>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/qr-scanner" className={`nav-link ${isActive('/qr-scanner')}`}>
              <span className="nav-icon">📸</span>
              Scan QR
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/attendance" className={`nav-link ${isActive('/attendance')}`}>
              <span className="nav-icon">✅</span>
              Attendance
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/messages" className={`nav-link ${isActive('/messages')}`}>
              <span className="nav-icon">💬</span>
              Messages
              {unreadMessages > 0 && (
                <span className="badge">{unreadMessages}</span>
              )}
            </Link>
          </li>
          {user.role === 'lecturer' ? (
            <>
              <li className="nav-item">
                <Link to="/notification-portal" className={`nav-link ${isActive('/notification-portal')}`}>
                  <span className="nav-icon">📢</span>
                  Notify Students
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/qr-generator" className={`nav-link ${isActive('/qr-generator')}`}>
                  <span className="nav-icon">🎯</span>
                  Generate QR
                </Link>
              </li>
            </>
          ) : user.role === 'student' ? (
            <>
              <li className="nav-item">
                <Link to="/notifications" className={`nav-link ${isActive('/notifications')}`}>
                  <span className="nav-icon">🔔</span>
                  Notifications
                  {unreadNotifications > 0 && (
                    <span className="badge">{unreadNotifications}</span>
                  )}
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/missed-lectures" className={`nav-link ${isActive('/missed-lectures')}`}>
                  <span className="nav-icon">📋</span>
                  Report Absence
                </Link>
              </li>
            </>
          ) : null}

          {user.role === 'admin' && (
            <>
              <li className="nav-item">
                <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                  <span className="nav-icon">⚙️</span>
                  Admin Panel
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin-messaging" className={`nav-link ${isActive('/admin-messaging')}`}>
                  <span className="nav-icon">💬</span>
                  Student Messages
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/data-management" className={`nav-link ${isActive('/data-management')}`}>
                  <span className="nav-icon">🔧</span>
                  Data Management
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/analytics" className={`nav-link ${isActive('/analytics')}`}>
                  <span className="nav-icon">📊</span>
                  Analytics
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/attendance-analysis" className={`nav-link ${isActive('/attendance-analysis')}`}>
                  <span className="nav-icon">📊</span>
                  Attendance Analysis
                </Link>
              </li>
            </>
          )}
        </ul>

        <div className="navbar-right">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
            <button>🔍</button>
          </div>

          <button 
            type="button"
            className="hamburger-menu"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
            aria-expanded={showMobileMenu}
            aria-controls="mobile-menu"
          >
            <span className={`hamburger-line ${showMobileMenu ? 'active' : ''}`}></span>
            <span className={`hamburger-line ${showMobileMenu ? 'active' : ''}`}></span>
            <span className={`hamburger-line ${showMobileMenu ? 'active' : ''}`}></span>
          </button>

          <div className="user-menu">
            <button 
              type="button"
              aria-haspopup="true"
              aria-expanded={showDropdown}
              aria-controls="user-dropdown"
              className="user-button"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="user-avatar">{user.avatar}</span>
              <span className="user-name">{user.name}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showDropdown && (
              <div id="user-dropdown" className="dropdown-menu" role="menu">
                <div className="dropdown-header">
                  <span className="role-badge">{user.role.toUpperCase()}</span>
                </div>
                <Link to="/profile" className="dropdown-item" role="menuitem" onClick={() => setShowDropdown(false)}>
                  👤 Profile
                </Link>
                <Link to="/" className="dropdown-item" role="menuitem" onClick={() => setShowDropdown(false)}>
                  ⚙️ Settings
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {showMobileMenu && (
          <nav id="mobile-menu" className="mobile-menu" role="dialog" aria-modal="true">
            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button 
                type="button"
                className="mobile-menu-close"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="mobile-menu-content">
              <Link to="/profile" className="mobile-menu-item" onClick={closeMobileMenu}>
                👤 Update Profile
              </Link>
              <div className="mobile-menu-divider"></div>
              <button className="mobile-menu-item logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </nav>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
