import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useSocket from '../hooks/useSocket';
import './PortalHeader.css';

export default function PortalHeader({ portalTitle, navItems }) {
  const { user, logout } = useAuth();
  const { notifications, getUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected, connectionError } = useSocket();
  // Socket used for real-time updates
  // eslint-disable-next-line no-unused-vars
  const socketRef = socket;
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveUpdates, setLiveUpdates] = useState('Connected');
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    setUnreadCount(getUnreadCount());
  }, [notifications, getUnreadCount]);

  // Monitor WebSocket connection
  useEffect(() => {
    if (isConnected) {
      setLiveUpdates('Connected');
    } else if (connectionError) {
      setLiveUpdates('Connection Error');
    } else {
      setLiveUpdates('Connecting...');
    }
  }, [isConnected, connectionError]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = () => {
    if (liveUpdates === 'Connected') return 'text-green-600';
    if (liveUpdates === 'Connecting...') return 'text-yellow-600';
    return 'text-red-600';
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="portal-header bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          {/* Left: Portal title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{portalTitle}</h1>
            <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor()} font-medium flex items-center space-x-1`}>
              <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse"></span>
              <span>{liveUpdates}</span>
            </div>
          </div>

          {/* Right: Notifications, User menu, Logout */}
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition duration-200"
                aria-label="Notifications"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Recent Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notif, idx) => (
                        <div key={idx} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                          <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition duration-200"
                aria-label="User menu"
              >
                <span className="text-2xl">👤</span>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'Unknown'}</p>
                </div>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">Role: {user?.role}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/portal/' + user?.role?.toLowerCase() + '/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center space-x-2"
                  >
                    <span>⚙️</span>
                    <span>Profile & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/portal/' + user?.role?.toLowerCase() + '/security');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center space-x-2"
                  >
                    <span>🔒</span>
                    <span>Security & Privacy</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/portal/' + user?.role?.toLowerCase() + '/preferences');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Preferences</span>
                  </button>

                  <div className="border-t border-gray-200 p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition rounded flex items-center space-x-2 font-medium"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Navigation items */}
        <nav className="hidden md:flex pb-0 space-x-1 -mx-4 px-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-3 rounded-t-lg transition-all duration-200 flex items-center space-x-2 font-medium text-sm ${
                isActive(item.path)
                  ? 'bg-gradient-to-b from-gray-100 to-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Mobile: Responsive navigation */}
        <div className="md:hidden flex space-x-2 pb-3 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-2 rounded-lg transition-all text-sm whitespace-nowrap font-medium ${
                isActive(item.path)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
