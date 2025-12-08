import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Auth Context
 * Manages user authentication state globally
 * Provides: user, token, login, logout, signup
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Set auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  /**
   * Register new user
   */
  const register = async (email, password, firstName, lastName, role, studentId = null) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/register`, {
        email, password, firstName, lastName, role, studentId
      });
      setUser(response.data.data.user);
      setToken(response.data.data.token);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      setUser(response.data.data.user);
      setToken(response.data.data.token);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   * Clears token and user data
   * Notifies backend of logout
   */
  const logout = async () => {
    try {
      // Optional: Notify backend of logout
      if (token) {
        try {
          await axios.post(`${API_URL}/auth/logout`);
        } catch (err) {
          // Backend logout failed, but proceed with client-side logout
          console.warn('Backend logout failed, clearing local data');
        }
      }
      setUser(null);
      setToken(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Force logout even if error occurs
      setUser(null);
      setToken(null);
    }
  };

  /**
   * Get current user
   */
  const getCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch user');
      logout();
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
