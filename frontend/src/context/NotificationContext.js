import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [lecturerNotifications, setLecturerNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to notification server');
      setConnected(true);
      // Join user's notification room for personal notifications
      newSocket.emit('join-user-room', user.id);
      // Join course room for course-wide notifications
      newSocket.emit('join-course-room', user.courseId || 'general');
    });

    // INSTANT notification listener - receives in real-time
    newSocket.on('new-notification', (notification) => {
      console.log('🔔 INSTANT notification received:', notification);
      // Add to state immediately
      setNotifications(prev => [notification, ...prev]);
    });

    newSocket.on('connection-confirmed', (data) => {
      console.log('✅ Connection confirmed:', data);
    });

    newSocket.on('notification-read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    });

    newSocket.on('notification-deleted', ({ notificationId }) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from notification server');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Fetch notifications from backend on mount
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:5000/notifications/user/${user.id}`);
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  const addNotification = useCallback((notification) => {
    const newNotif = {
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotif, ...prev]);
    return newNotif;
  }, []);

  const addLecturerNotification = useCallback((notification) => {
    const newNotif = {
      id: `lecturer_notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...notification
    };
    setLecturerNotifications(prev => [newNotif, ...prev]);
    return newNotif;
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    // Update on backend
    if (user) {
      fetch(`http://localhost:5000/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      }).catch(err => console.error('Error marking notification as read:', err));
    }
  }, [user]);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Delete from backend
    if (user) {
      fetch(`http://localhost:5000/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      }).catch(err => console.error('Error deleting notification:', err));
    }
  }, [user]);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendNotificationToStudents = useCallback(async (notification) => {
    try {
      const response = await fetch('http://localhost:5000/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          instructorId: user?.id,
          instructorName: user?.name
        })
      });
      const data = await response.json();
      if (data.success) {
        addLecturerNotification(data.notification);
        return data;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }, [user, addLecturerNotification]);

  const value = {
    notifications,
    lecturerNotifications,
    addNotification,
    addLecturerNotification,
    markAsRead,
    deleteNotification,
    getUnreadCount,
    clearAllNotifications,
    sendNotificationToStudents,
    socket,
    connected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
