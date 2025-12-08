import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

/**
 * Real-Time Notification Context
 * Manages WebSocket connections and real-time updates
 * Emits and receives Socket.IO events
 */

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [classUpdates, setClassUpdates] = useState({});

  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user || !token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      setIsConnected(true);
      
      // Join user-specific room
      newSocket.emit('user:join', user.id);
      
      // Join all user's classes
      user.classes?.forEach(classId => {
        newSocket.emit('class:join', classId);
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
      setIsConnected(false);
    });

    // Real-time notification events
    newSocket.on('notification:received', (notification) => {
      console.log('🔔 Notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    // Attendance update events
    newSocket.on('attendance:updated', (data) => {
      console.log('📝 Attendance marked:', data);
      setClassUpdates(prev => ({
        ...prev,
        [data.classId]: { ...prev[data.classId], lastUpdate: new Date() }
      }));
    });

    // Class cancellation event
    newSocket.on('class:cancelled', (data) => {
      console.log('❌ Class cancelled:', data);
      addNotification('Class Cancelled', data.reason || 'Your class has been cancelled', 'alert');
    });

    // Class reschedule event
    newSocket.on('class:rescheduled', (data) => {
      console.log('📅 Class rescheduled:', data);
      addNotification('Class Rescheduled', `New time: ${data.dayOfWeek} ${data.startTime}`, 'info');
    });

    newSocket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  /**
   * Add notification
   */
  const addNotification = (title, message, type = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date(),
      isRead: false
    };
    setNotifications(prev => [notification, ...prev]);
  };

  /**
   * Clear notification
   */
  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * Mark notification as read
   */
  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  /**
   * Join class room
   */
  const joinClass = (classId) => {
    if (socket) {
      socket.emit('class:join', classId);
    }
  };

  /**
   * Leave class room
   */
  const leaveClass = (classId) => {
    if (socket) {
      socket.emit('class:leave', classId);
    }
  };

  const value = {
    socket,
    notifications,
    isConnected,
    classUpdates,
    addNotification,
    clearNotification,
    markAsRead,
    joinClass,
    leaveClass,
    unreadCount: notifications.filter(n => !n.isRead).length
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
