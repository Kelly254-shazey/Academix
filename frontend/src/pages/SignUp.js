import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student', // 'student', 'lecturer', 'admin'
    studentId: '',
    department: 'Computer Science',
    subject: '' // For lecturers
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
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

    if (formData.role === 'lecturer' && !formData.subject) {
      setError('Subject is required for lecturer accounts');
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

    // Determine avatar based on role
    const avatarMap = {
      student: '👨‍🎓',
      lecturer: '👨‍🏫',
      admin: '👨‍💼'
    };

    // Simulate API call
    setTimeout(() => {
      try {
        const signupData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          avatar: avatarMap[formData.role],
          department: formData.department
        };

        // Add role-specific data
        if (formData.role === 'student') {
          signupData.studentId = formData.studentId;
        } else if (formData.role === 'lecturer') {
          signupData.subject = formData.subject;
        }

        signup(signupData);
        navigate('/');
      } catch (err) {
        setError('Sign up failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
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
              <button
                type="button"
                className={`role-button ${formData.role === 'student' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                disabled={isLoading}
              >
                <span className="role-icon">👨‍🎓</span>
                <span className="role-label">Student</span>
              </button>
              <button
                type="button"
                className={`role-button ${formData.role === 'lecturer' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, role: 'lecturer' }))}
                disabled={isLoading}
              >
                <span className="role-icon">👨‍🏫</span>
                <span className="role-label">Lecturer</span>
              </button>
              <button
                type="button"
                className={`role-button ${formData.role === 'admin' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                disabled={isLoading}
              >
                <span className="role-icon">👨‍💼</span>
                <span className="role-label">Admin</span>
              </button>
            </div>
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

          {formData.role === 'lecturer' && (
            <div className="form-group">
              <label htmlFor="subject">Subject/Department</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="e.g., Computer Science, Mathematics"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="department">Department</label>
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
