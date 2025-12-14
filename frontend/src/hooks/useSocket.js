import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(path = '/') {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const url = process.env.REACT_APP_SOCKET_URL || window.location.origin;

    const socket = io(url, {
      path,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnection needed
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection failed:', error);
      setConnectionError(error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed permanently');
      setConnectionError('Failed to reconnect to server');
    });

    // Cleanup on unmount
    return () => {
      try {
        socket.disconnect();
        setIsConnected(false);
      } catch (e) {
        console.warn('Error disconnecting socket:', e);
      }
    };
  }, [path]);

  return { socket: socketRef, isConnected, connectionError };
}

export default useSocket;
