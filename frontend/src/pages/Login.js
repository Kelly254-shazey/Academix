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

  // Removed quick-login helper (demo credentials removed)

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

        {/* Removed demo credentials UI for production - use real accounts */}

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
