import React, { useState } from 'react';
import './MissedLectureForm.css';

function MissedLectureForm() {
  const [formData, setFormData] = useState({
    lectureId: '',
    courseName: '',
    reason: '',
    studentName: '',
    submitAnonymously: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.courseName || !formData.reason) {
        setMessage('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/feedback/anonymous-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lectureId: formData.lectureId || `lec_${Date.now()}`,
          courseName: formData.courseName,
          reason: formData.reason,
          studentName: formData.submitAnonymously ? 'Anonymous Student' : formData.studentName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Failed to submit message');
        return;
      }

      setMessage('✅ Your message has been submitted successfully!');
      setSubmitted(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          lectureId: '',
          courseName: '',
          reason: '',
          studentName: '',
          submitAnonymously: true
        });
        setMessage('');
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage('Failed to connect to server. Ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="missed-lecture-container">
      <div className="missed-lecture-card">
        <h2>📋 Report Missed Lecture</h2>
        <p className="subtitle">Submit anonymous feedback about missed lectures</p>

        {message && (
          <div className={`alert ${submitted ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Lecture Details</h3>

            <div className="form-group">
              <label htmlFor="courseName">Course Name *</label>
              <input
                type="text"
                id="courseName"
                name="courseName"
                value={formData.courseName}
                onChange={handleChange}
                placeholder="e.g., Computer Science 101"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lectureId">Lecture ID (Optional)</label>
              <input
                type="text"
                id="lectureId"
                name="lectureId"
                value={formData.lectureId}
                onChange={handleChange}
                placeholder="Enter lecture ID if known"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Reason for Absence</h3>

            <div className="form-group">
              <label htmlFor="reason">Reason *</label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Explain why you missed this lecture..."
                rows="5"
                required
              />
            </div>

            <p className="help-text">
              Be honest and detailed. This helps administrators understand attendance patterns and provide better support.
            </p>
          </div>

          <div className="form-section">
            <h3>Your Information</h3>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="submitAnonymously"
                  checked={formData.submitAnonymously}
                  onChange={handleChange}
                />
                <span>Submit anonymously</span>
              </label>
              <p className="help-text">
                When checked, your name will be hidden from administrators.
              </p>
            </div>

            {!formData.submitAnonymously && (
              <div className="form-group">
                <label htmlFor="studentName">Your Name</label>
                <input
                  type="text"
                  id="studentName"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>

        <div className="info-box">
          <h4>ℹ️ Why Submit This?</h4>
          <ul>
            <li>Helps administrators understand attendance challenges</li>
            <li>Provides data for attendance support programs</li>
            <li>Ensures your absence is documented</li>
            <li>Completely anonymous if you choose</li>
            <li>No penalties for honest feedback</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MissedLectureForm;
