import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student', // 'student', 'lecturer', 'admin'
    studentId: '',
    department: 'Computer Science'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    // Role-specific validation
    if (formData.role === 'student' && !formData.studentId) {
      setError('Student ID is required for student accounts');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'lecturer' && !formData.department) {
      setError('Subject/Specialization is required for lecturer accounts');
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Call backend API
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email.toLowerCase(),
          password: formData.password,
          role: formData.role,
          department: formData.department,
          studentId: formData.role === 'student' ? formData.studentId : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Store token
      localStorage.setItem('token', data.token);

      // Login user with the returned user data
      login(data.user);

      // Redirect to home
      navigate('/');
    } catch (err) {
      console.error('Sign up error:', err);
      setError(`Failed to connect to server. Make sure backend is running on ${API_URL}.`);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box signup-box">
        <div className="auth-header">
          <div className="auth-logo">📚</div>
          <h1>ClassTrack AI</h1>
          <p>Join our learning community</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Create Account</h2>

          {error && <div className="error-alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <div className="role-selector">
              <div
                className={`role-button ${formData.role === 'student' ? 'active' : ''}`}
                onClick={() => handleChange({ target: { name: 'role', value: 'student' } })}
              >
                <span className="role-icon">👨‍🎓</span>
                <span className="role-label">Student</span>
              </div>
              <div
                className={`role-button ${formData.role === 'lecturer' ? 'active' : ''}`}
                onClick={() => handleChange({ target: { name: 'role', value: 'lecturer' } })}
              >
                <span className="role-icon">👨‍🏫</span>
                <span className="role-label">Lecturer</span>
              </div>
              <div
                className={`role-button ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => handleChange({ target: { name: 'role', value: 'admin' } })}
              >
                <span className="role-icon">👔</span>
                <span className="role-label">Admin</span>
              </div>
            </div>
            <small className="muted">Select your account type to get started.</small>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          {formData.role === 'student' && (
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Enter your student ID"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="department">{formData.role === 'lecturer' ? 'Subject/Specialization' : 'Department'}</label>
            {formData.role === 'lecturer' ? (
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter your subject/specialization"
                disabled={isLoading}
              />
            ) : (
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option>Computer Science</option>
                <option>Information Technology</option>
                <option>Engineering</option>
                <option>Business</option>
                <option>Liberal Arts</option>
                <option>Other</option>
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>

          <div className="terms-checkbox">
            <label>
              <input type="checkbox" defaultChecked />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign in here</Link></p>
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

export default SignUp;
