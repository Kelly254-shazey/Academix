/**
 * Session Timeout Hook
 * Auto-logout after inactivity
 */

import { useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const useSessionTimeout = (timeoutMinutes = 30) => {
  const navigate = useNavigate();
  const { setUser, setToken } = useContext(AuthContext);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  useEffect(() => {
    const resetTimeout = () => {
      // Clear existing timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);

      // Set warning timeout (2 minutes before logout)
      warningRef.current = setTimeout(() => {
        console.warn('Session expiring soon');
        // Could show a warning modal here
      }, (timeoutMinutes - 2) * 60 * 1000);

      // Set logout timeout
      timeoutRef.current = setTimeout(() => {
        handleLogout();
      }, timeoutMinutes * 60 * 1000);
    };

    const handleLogout = async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('fingerprint');
        setUser(null);
        setToken(null);
        navigate('/login');
      }
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      document.addEventListener(event, resetTimeout);
    });

    // Initial timeout set
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [timeoutMinutes, navigate, setUser, setToken]);
};

export default useSessionTimeout;
