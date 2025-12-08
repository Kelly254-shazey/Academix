import React, { useState, useRef } from 'react';
import './QRScanner.css';

function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedSessions, setScannedSessions] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const fileInputRef = useRef(null);

  // Simulate QR code scanning with HTML5 QR Code
  const startScanning = async () => {
    setScanning(true);
    setResult(null);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simulate QR code detection from image
      simulateQRDetection('SESSION-' + Math.random().toString(36).substr(2, 9).toUpperCase());
    }
  };

  const handleManualEntry = () => {
    if (manualCode.trim()) {
      simulateQRDetection(manualCode);
      setManualCode('');
    }
  };

  const simulateQRDetection = (code) => {
    // Simulate a valid QR code
    const classes = [
      { id: 'DATA-STRUCT-001', name: 'Data Structures', instructor: 'Dr. Smith', location: 'Room A101' },
      { id: 'WEB-DEV-002', name: 'Web Development', instructor: 'Prof. Johnson', location: 'Room B205' },
      { id: 'AI-ML-003', name: 'AI & Machine Learning', instructor: 'Dr. Patel', location: 'Room C301' },
      { id: 'DB-004', name: 'Database Systems', instructor: 'Dr. Wilson', location: 'Room A202' }
    ];

    const matchedClass = classes.find(cls => code.includes(cls.id)) || classes[Math.floor(Math.random() * classes.length)];

    const scanRecord = {
      id: Math.random().toString(36).substr(2, 9),
      code: code,
      className: matchedClass.name,
      instructor: matchedClass.instructor,
      location: matchedClass.location,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      status: 'Checked In'
    };

    setResult(scanRecord);
    setScannedSessions(prev => [scanRecord, ...prev]);
    setScanning(false);

    // Reset result after 3 seconds
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h1>📸 QR Code Scanner</h1>
        <p>Scan QR codes for class attendance</p>
      </div>

      <div className="scanner-grid">
        <div className="scanner-section">
          <div className="scanner-box">
            {!scanning ? (
              <div className="scanner-placeholder">
                <div className="qr-icon">🔍</div>
                <p>Click to start scanning</p>
              </div>
            ) : (
              <div className="scanner-active">
                <div className="scanner-frame">
                  <div className="corner-tl"></div>
                  <div className="corner-tr"></div>
                  <div className="corner-bl"></div>
                  <div className="corner-br"></div>
                  <div className="scanning-line"></div>
                </div>
                <p>Point your camera at a QR code</p>
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {!scanning ? (
              <>
                <button className="btn-scan" onClick={startScanning}>
                  📷 Start Scanning
                </button>
                <button 
                  className="btn-upload" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Upload QR Code
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <button className="btn-stop" onClick={stopScanning}>
                ⏹️ Stop Scanning
              </button>
            )}
          </div>

          <div className="manual-entry">
            <h3>Or enter manually</h3>
            <div className="manual-input-group">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter QR code or session ID..."
                onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              />
              <button onClick={handleManualEntry}>→</button>
            </div>
          </div>
        </div>

        <div className="scanner-results">
          {result && (
            <div className="scan-result success">
              <div className="result-icon">✅</div>
              <h3>{result.className}</h3>
              <p className="result-info">
                <strong>Instructor:</strong> {result.instructor}
              </p>
              <p className="result-info">
                <strong>Location:</strong> {result.location}
              </p>
              <p className="result-info">
                <strong>Time:</strong> {result.timestamp}
              </p>
              <div className="result-status">{result.status}</div>
            </div>
          )}

          {!result && scannedSessions.length === 0 && (
            <div className="no-scans">
              <div className="empty-icon">📋</div>
              <p>No scans yet. Start scanning to check in to classes!</p>
            </div>
          )}

          {scannedSessions.length > 0 && (
            <div className="scan-history">
              <h3>Today's Check-ins</h3>
              <div className="history-list">
                {scannedSessions.map((session) => (
                  <div key={session.id} className="history-item">
                    <div className="history-left">
                      <h4>{session.className}</h4>
                      <p>📍 {session.location}</p>
                      <p className="time">⏰ {session.timestamp}</p>
                    </div>
                    <div className="history-badge">✅</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
