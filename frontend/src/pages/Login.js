import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email');
        setIsLoading(false);
        return;
      }

      // Call backend API
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);

      // Login user
      login(data.user);

      // Redirect based on role
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(`Failed to connect to server. Make sure backend is running on ${API_URL}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setEmail(email);
    setPassword(password);
    
    // Auto-submit after setting state
    setTimeout(() => {
      const form = document.querySelector('.auth-form');
      if (form) form.dispatchEvent(new Event('submit'));
    }, 100);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">📚</div>
          <h1>ClassTrack AI</h1>
          <p>Attendance & Learning Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Welcome Back!</h2>

          {error && <div className="error-alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="form-remember">
            <label>
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="demo-credentials">
          <h4>📝 Demo Credentials - Quick Login:</h4>
          
          <div className="demo-role">
            <div className="role-header">
              <span className="role-badge">👨‍🎓 STUDENT</span>
            </div>
            <p className="role-details">student@university.edu</p>
            <p className="role-details small">password123</p>
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleQuickLogin('student@university.edu', 'password123')}
              disabled={isLoading}
            >
              Login as Student
            </button>
          </div>

          <div className="demo-role">
            <div className="role-header">
              <span className="role-badge">👨‍🏫 LECTURER</span>
            </div>
            <p className="role-details">lecturer@university.edu</p>
            <p className="role-details small">password123</p>
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleQuickLogin('lecturer@university.edu', 'password123')}
              disabled={isLoading}
            >
              Login as Lecturer
            </button>
          </div>

          <div className="demo-role">
            <div className="role-header">
              <span className="role-badge">👨‍💼 ADMIN</span>
            </div>
            <p className="role-details">admin@university.edu</p>
            <p className="role-details small">password123</p>
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleQuickLogin('admin@university.edu', 'password123')}
              disabled={isLoading}
            >
              Login as Admin
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up here</Link></p>
        </div>
      </div>

      <div className="auth-background">
        <div className="floating-icon">📚</div>
        <div className="floating-icon">📊</div>
        <div className="floating-icon">✅</div>
        <div className="floating-icon">💬</div>
      </div>
    </div>
  );
}

export default Login;
