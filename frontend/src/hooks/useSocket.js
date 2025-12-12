import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(path = '/') {
  const socketRef = useRef(null);

  useEffect(() => {
    const url = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    const socket = io(url, { path });
    socketRef.current = socket;

    return () => {
      try { socket.disconnect(); } catch (e) {}
    };
  }, [path]);

  return socketRef;
}

export default useSocket;
