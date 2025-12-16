import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../services/apiClient';
import socketService from '../services/socketService';
import healthCheckService from '../services/healthCheck';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        // Only restore session if token is valid
        // For now, always require fresh login
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        apiClient.setToken(null);
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    
    // Start health monitoring (disabled to prevent rate limiting)
    // healthCheckService.startMonitoring();
    
    setIsLoading(false);
    
    return () => {
      healthCheckService.stopMonitoring();
    };
  }, []);

  const login = async (userData, token) => {
    const userToStore = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || '👨🎓',
      studentId: userData.studentId,
      employeeId: userData.employeeId,
      department: userData.department || 'General',
      enrolledCourses: userData.enrolledCourses || [],
      courses: userData.courses || [],
      permissions: userData.permissions || []
    };
    setUser(userToStore);
    if (token) {
      setToken(token);
      localStorage.setItem('token', token);
      apiClient.setToken(token);
      
      // Initialize socket connection
      try {
        await socketService.connect(token, userToStore.id, userToStore.role);
        console.log('✅ Socket connected successfully');
      } catch (error) {
        console.error('❌ Socket connection failed:', error);
      }
    }
    localStorage.setItem('user', JSON.stringify(userToStore));
  };

  const logout = () => {
    // Disconnect socket
    socketService.disconnect();
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    apiClient.setToken(null);
  };

  const signup = async (userData) => {
    try {
      const apiClientModule = await import('../services/apiClient');
      const data = await apiClientModule.default.register({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role || 'student',
        department: userData.department || 'General',
        studentId: userData.studentId,
        subject: userData.subject
      });

      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }

      await login(data.user, data.token);
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const verifyToken = async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return false;

    try {
      apiClient.setToken(storedToken);
      const data = await apiClient.verifyToken();
      if (data && data.user) {
        await login(data.user, storedToken);
        setToken(storedToken);
        return true;
      }
      logout();
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      token,
      login,
      logout,
      signup,
      updateUser,
      verifyToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;