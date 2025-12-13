import React, { useRef, useEffect, useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const QRScanner = () => {
  const videoRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (videoRef.current && !scanner) {
      // Note: QrScanner library needs to be installed
      // For now, show a placeholder
      setFeedback('QR Scanner library not installed. Please install qr-scanner package.');
    }

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [scanner]);

  const handleScan = async (qrData) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const response = await fetch(`${API_URL}/qr/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qr_token: qrData })
      });

      if (response.ok) {
        const result = await response.json();
        setFeedback('Check-in successful!');
      } else {
        const error = await response.json();
        setFeedback(`Check-in failed: ${error.message}`);
      }
    } catch (err) {
      setFeedback('Error during check-in');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">QR Code Scanner</h1>
      <div className="max-w-md mx-auto">
        <video ref={videoRef} className="w-full border rounded" />
        <p className="mt-4 text-center text-gray-600">
          Point your camera at a QR code to check in.
        </p>
        {feedback && (
          <p className={`mt-4 text-center ${feedback.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
