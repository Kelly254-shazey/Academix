import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './NotificationCenter.css';

function NotificationCenter() {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const { notifications, markAsRead, deleteNotification, getUnreadCount } = useNotifications();
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filterType || (filterType === 'missing-class' && n.type === 'missing-class-alert'));

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const handleDelete = (id) => {
    deleteNotification(id);
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read) markAsRead(n.id);
    });
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'class-start':
        return '⏰';
      case 'missing-class':
      case 'missing-class-alert':
        return '⚠️';
      default:
        return '📢';
    }
  };

  const getNotificationBgClass = (type) => {
    if (type === 'class-start') return 'class-start-bg';
    if (type === 'missing-class' || type === 'missing-class-alert') return 'missing-class-bg';
    return 'default-bg';
  };

  const unreadCount = getUnreadCount();

  return (
    <div className="notification-center-container">
      <div className="center-header">
        <div className="header-content">
          <h1>🔔 Notification Center</h1>
          <p>Stay updated with class schedules and attendance notifications</p>
        </div>
        {unreadCount > 0 && (
          <div className="unread-badge">
            {unreadCount} Unread
          </div>
        )}
      </div>

      <div className="center-controls">
        <div className="filter-group">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            📢 All ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filterType === 'class-start' ? 'active' : ''}`}
            onClick={() => setFilterType('class-start')}
          >
            ⏰ Class Start ({notifications.filter(n => n.type === 'class-start').length})
          </button>
          <button 
            className={`filter-btn ${filterType === 'missing-class' ? 'active' : ''}`}
            onClick={() => setFilterType('missing-class')}
          >
            ⚠️ Attendance ({notifications.filter(n => n.type === 'missing-class-alert' || n.type === 'missing-class').length})
          </button>
        </div>

        <div className="view-controls">
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            ≡
          </button>
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            ⊞
          </button>
          {unreadCount > 0 && (
            <button 
              className="mark-all-btn"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
            >
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      <div className={`notifications-${viewMode}`}>
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Notifications</h3>
            <p>
              {filterType === 'all' 
                ? "You're all caught up! No new notifications." 
                : `No ${filterType === 'class-start' ? 'class start' : 'attendance'} notifications.`}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${getNotificationBgClass(notification.type)} ${notification.read ? 'read' : 'unread'}`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="notification-content">
                <h4 className="notification-title">
                  {notification.title || notification.course}
                </h4>
                <p className="notification-message">
                  {notification.message}
                </p>

                <div className="notification-details">
                  {notification.type === 'class-start' && (
                    <>
                      {notification.classTime && (
                        <span className="detail-badge">🕐 {notification.classTime}</span>
                      )}
                      {notification.location && (
                        <span className="detail-badge">📍 {notification.location}</span>
                      )}
                      {notification.instructor && (
                        <span className="detail-badge">👨‍🏫 {notification.instructor}</span>
                      )}
                    </>
                  )}

                  {(notification.type === 'missing-class' || notification.type === 'missing-class-alert') && (
                    <>
                      {notification.course && (
                        <span className="detail-badge">📚 {notification.course}</span>
                      )}
                      {notification.absenceReason && (
                        <span className="detail-badge">🔍 {notification.absenceReason}</span>
                      )}
                      {notification.instructor && (
                        <span className="detail-badge">👨‍🏫 {notification.instructor}</span>
                      )}
                    </>
                  )}

                  {notification.timestamp && (
                    <span className="detail-badge time">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                  )}
                  
                  {notification.delivered && (
                    <span className="detail-badge delivered">✓ Delivered instantly</span>
                  )}
                </div>
              </div>

              <div className="notification-actions">
                {!notification.read && (
                  <span className="unread-indicator">●</span>
                )}
                <button 
                  className="action-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  title="Delete notification"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="center-footer">
        <p>Showing {filteredNotifications.length} of {notifications.length} notifications</p>
      </div>
    </div>
  );
}

export default NotificationCenter;
