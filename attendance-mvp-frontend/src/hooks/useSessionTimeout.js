import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * useSessionTimeout Hook
 * Automatically logs out user after specified inactivity period
 * Tracks mouse, keyboard, and touch events
 * 
 * Usage: useSessionTimeout(timeoutMinutes)
 * Default: 30 minutes
 */
export const useSessionTimeout = (timeoutMinutes = 30) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId = null;

    // Convert minutes to milliseconds
    const timeoutMs = timeoutMinutes * 60 * 1000;

    // Reset timer on user activity
    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      timeoutId = setTimeout(async () => {
        console.warn(`Session timeout: No activity for ${timeoutMinutes} minutes`);
        await logout();
        navigate('/login');
      }, timeoutMs);
    };

    // Event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated, timeoutMinutes, logout, navigate]);
};

export default useSessionTimeout;
