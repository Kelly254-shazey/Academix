import React, { useState, useEffect } from 'react';
import './QRGenerator.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function QRGenerator() {
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    courseName: '',
    lectureId: '',
    expirationMinutes: 15,
    maxScans: 100
  });
  const [generatedQR, setGeneratedQR] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/qr/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.warn('Could not fetch sessions from backend:', error);
      // Sessions not available if backend is offline
      setSessions([]);
    }
  };

  const generateQRCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!newSession.courseName || !newSession.lectureId) {
      setError('Course name and lecture ID are required');
      setIsLoading(false);
      return;
    }

    try {
      // Try to generate via backend
      try {
        const response = await fetch(`${API_URL}/qr/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseName: newSession.courseName,
            lectureId: newSession.lectureId,
            expirationMinutes: newSession.expirationMinutes,
            maxScans: newSession.maxScans
          })
        });

        if (response.ok) {
          const data = await response.json();
          handleQRGenerated(data.session);
          return;
        }
      } catch (backendError) {
        console.warn('Backend QR generation failed, using local method:', backendError);
      }

      // Fallback: Generate locally
      const qrCode = generateLocalQRCode();
      handleQRGenerated(qrCode);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLocalQRCode = () => {
    const sessionId = 'QR' + Date.now().toString(36).toUpperCase();
    const expiresAt = new Date(Date.now() + newSession.expirationMinutes * 60000);

    const session = {
      id: sessionId,
      courseName: newSession.courseName,
      lectureId: newSession.lectureId,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${sessionId}`,
      expiresAt: expiresAt.toISOString(),
      expirationMinutes: newSession.expirationMinutes,
      createdAt: new Date().toISOString(),
      scansCount: 0,
      maxScans: newSession.maxScans,
      status: 'active'
    };

    return session;
  };

  const handleQRGenerated = (session) => {
    setGeneratedQR(session);
    
    // Save to sessions list
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    
    // Save to localStorage for persistence
    localStorage.setItem('qrSessions', JSON.stringify(updatedSessions));

    // Reset form
    setNewSession({
      courseName: '',
      lectureId: '',
      expirationMinutes: 15,
      maxScans: 100
    });
    setShowForm(false);
  };

  const copyQRCode = (qrSession) => {
    const text = `${qrSession.courseName} - ${qrSession.lectureId}\nExpires: ${new Date(qrSession.expiresAt).toLocaleTimeString()}\nCode: ${qrSession.id}`;
    navigator.clipboard.writeText(text);
    alert('QR Code details copied to clipboard!');
  };

  const downloadQRCode = (qrSession) => {
    const link = document.createElement('a');
    link.href = qrSession.qrCode;
    link.download = `${qrSession.lectureId}-qr.png`;
    link.click();
  };

  const endSession = (sessionId) => {
    const updatedSessions = sessions.map(session =>
      session.id === sessionId ? { ...session, status: 'ended' } : session
    );
    setSessions(updatedSessions);
    localStorage.setItem('qrSessions', JSON.stringify(updatedSessions));
    setGeneratedQR(null);
  };

  const isSessionExpired = (session) => {
    return new Date() > new Date(session.expiresAt);
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff < 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="qr-generator-container">
      <div className="qr-header">
        <h1>🎓 QR Code Attendance Generator</h1>
        <p>Generate unique QR codes for your lectures to track student attendance</p>
      </div>

      {/* Active Session Display */}
      {generatedQR && !isSessionExpired(generatedQR) && generatedQR.status === 'active' && (
        <div className="active-session">
          <div className="session-info">
            <h2>📍 Active Session</h2>
            <div className="session-details">
              <div className="detail-item">
                <span className="label">Course:</span>
                <span className="value">{generatedQR.courseName}</span>
              </div>
              <div className="detail-item">
                <span className="label">Lecture ID:</span>
                <span className="value">{generatedQR.lectureId}</span>
              </div>
              <div className="detail-item">
                <span className="label">Session Code:</span>
                <span className="value code">{generatedQR.id}</span>
              </div>
              <div className="detail-item">
                <span className="label">Time Remaining:</span>
                <span className="value time-remaining">
                  {getTimeRemaining(generatedQR.expiresAt)}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Scans:</span>
                <span className="value">
                  {generatedQR.scansCount} / {generatedQR.maxScans}
                </span>
              </div>
            </div>
          </div>

          <div className="qr-code-display">
            <img src={generatedQR.qrCode} alt="QR Code" className="qr-image" />
            <p className="qr-instruction">📱 Students can scan this code to mark attendance</p>
          </div>

          <div className="session-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => copyQRCode(generatedQR)}
            >
              📋 Copy Details
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => downloadQRCode(generatedQR)}
            >
              ⬇️ Download QR Code
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => endSession(generatedQR.id)}
            >
              ⏹️ End Session
            </button>
          </div>

          {isSessionExpired(generatedQR) && (
            <div className="expiration-warning">
              ⏱️ This QR code has expired. Students can no longer scan it.
            </div>
          )}
        </div>
      )}

      {/* New Session Form */}
      <div className="form-section">
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Generate New QR Code'}
        </button>

        {showForm && (
          <form onSubmit={generateQRCode} className="qr-form">
            {error && <div className="error-alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="courseName">Course Name</label>
              <input
                type="text"
                id="courseName"
                value={newSession.courseName}
                onChange={(e) => setNewSession({ ...newSession, courseName: e.target.value })}
                placeholder="e.g., Computer Science 101"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lectureId">Lecture ID / Session Name</label>
              <input
                type="text"
                id="lectureId"
                value={newSession.lectureId}
                onChange={(e) => setNewSession({ ...newSession, lectureId: e.target.value })}
                placeholder="e.g., Lecture 5 - Arrays"
                disabled={isLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expirationMinutes">Expiration (Minutes)</label>
                <input
                  type="number"
                  id="expirationMinutes"
                  min="1"
                  max="120"
                  value={newSession.expirationMinutes}
                  onChange={(e) => setNewSession({ ...newSession, expirationMinutes: parseInt(e.target.value) })}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxScans">Max Scans Allowed</label>
                <input
                  type="number"
                  id="maxScans"
                  min="1"
                  max="500"
                  value={newSession.maxScans}
                  onChange={(e) => setNewSession({ ...newSession, maxScans: parseInt(e.target.value) })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-success" disabled={isLoading}>
              {isLoading ? 'Generating...' : '🎯 Generate QR Code'}
            </button>
          </form>
        )}
      </div>

      {/* Previous Sessions */}
      {sessions.length > 0 && (
        <div className="sessions-history">
          <h2>📜 Recent Sessions</h2>
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className={`session-card ${session.status}`}>
                <div className="session-card-header">
                  <h3>{session.courseName}</h3>
                  <span className={`status-badge ${session.status}`}>
                    {isSessionExpired(session) ? '⏱️ Expired' : '✅ Active'}
                  </span>
                </div>

                <div className="session-card-body">
                  <p><strong>Lecture:</strong> {session.lectureId}</p>
                  <p><strong>Code:</strong> <code>{session.id}</code></p>
                  <p><strong>Time Remaining:</strong> {getTimeRemaining(session.expiresAt)}</p>
                  <p><strong>Scans:</strong> {session.scansCount} / {session.maxScans}</p>
                  <p><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</p>
                </div>

                <div className="session-card-actions">
                  {!isSessionExpired(session) && session.status === 'active' && (
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => setGeneratedQR(session)}
                    >
                      👁️ View
                    </button>
                  )}
                  <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => downloadQRCode(session)}
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <h3>ℹ️ How It Works</h3>
        <div className="help-content">
          <div className="help-item">
            <h4>1️⃣ Generate QR Code</h4>
            <p>Enter course name, lecture details, and set expiration time (1-120 minutes)</p>
          </div>
          <div className="help-item">
            <h4>2️⃣ Display to Students</h4>
            <p>Display the QR code to your students via projector, screen share, or printed materials</p>
          </div>
          <div className="help-item">
            <h4>3️⃣ Students Scan</h4>
            <p>Students use their phones to scan the QR code to mark attendance</p>
          </div>
          <div className="help-item">
            <h4>4️⃣ Automatic Expiration</h4>
            <p>QR code expires after the set time, preventing late scanning</p>
          </div>
          <div className="help-item">
            <h4>🎯 Features</h4>
            <ul>
              <li>✅ Unique code for each session</li>
              <li>✅ Time-based expiration</li>
              <li>✅ Scan counter</li>
              <li>✅ Download for offline use</li>
              <li>✅ Session history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRGenerator;
