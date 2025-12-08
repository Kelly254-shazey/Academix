import React, { createContext, useState, useContext, useEffect } from 'react';

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
    // Check if user and token are already stored
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData) => {
    const userToStore = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || '👨‍🎓',
      studentId: userData.studentId,
      employeeId: userData.employeeId,
      department: userData.department || 'General',
      enrolledCourses: userData.enrolledCourses || [],
      courses: userData.courses || [],
      permissions: userData.permissions || []
    };
    setUser(userToStore);
    localStorage.setItem('user', JSON.stringify(userToStore));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const signup = async (userData) => {
    try {
      // For demo mode, accept signup without backend
      // In production, uncomment the backend API call below
      
      // If backend is available, try to register
      try {
        const response = await fetch('http://localhost:5000/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            name: userData.name,
            role: userData.role || 'student',
            department: userData.department || 'General',
            studentId: userData.studentId,
            subject: userData.subject
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        // Store token
        if (data.token) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
        }

        // Login user
        login(data.user);
        return data;
      } catch (backendError) {
        // If backend fails, create user locally (demo mode)
        console.warn('Backend registration failed, using demo mode:', backendError.message);
        
        const localUser = {
          id: `${userData.role}_${Date.now()}`,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'student',
          avatar: userData.avatar || '👨‍🎓',
          department: userData.department || 'General',
          studentId: userData.studentId,
          subject: userData.subject,
          enrolledCourses: [],
          courses: [],
          permissions: userData.role === 'admin' ? ['all'] : []
        };

        login(localUser);
        
        // Generate a demo token
        const demoToken = 'demo_token_' + Date.now();
        localStorage.setItem('token', demoToken);
        setToken(demoToken);

        return { user: localUser, token: demoToken };
      }
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
      const response = await fetch('http://localhost:5000/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        login(data.user);
        setToken(storedToken);
        return true;
      } else {
        logout();
        return false;
      }
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
