import React, { useRef, useEffect, useState } from 'react';
import QrScanner from 'qr-scanner';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import apiClient from '../../services/apiClient';



const QRScanner = () => {
  const videoRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const { user } = useAuth();
  const { socket, connected } = useNotifications();

  useEffect(() => {
    if (videoRef.current && !scanner) {
      try {
        const qrScanner = new QrScanner(
          videoRef.current,
          result => handleScan(result.data),
          {
            onDecodeError: err => {
              // Ignore decode errors, they're normal
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        setScanner(qrScanner);
        setFeedback('QR Scanner ready. Point camera at QR code.');
      } catch (err) {
        console.error('Failed to initialize QR scanner:', err);
        setFeedback('Failed to initialize camera. Please check permissions.');
      }
    }

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [scanner]);

  // Socket.IO listeners for real-time QR updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleQRRotated = (data) => {
      console.log('🔄 QR code rotated for session:', data.sessionId);
      setFeedback('QR code has been refreshed. Please scan the new code.');
      // Could vibrate or play sound here
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    };

    socket.on('lecturer-qr-rotated', handleQRRotated);

    return () => {
      socket.off('lecturer-qr-rotated', handleQRRotated);
    };
  }, [socket, connected]);

  const startScanning = async () => {
    if (!scanner) return;

    try {
      await scanner.start();
      setIsScanning(true);
      setFeedback('Scanning... Point camera at QR code.');
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      setFeedback('Failed to start camera. Please check permissions.');
    }
  };

  const stopScanning = async () => {
    if (!scanner) return;

    try {
      await scanner.stop();
      setIsScanning(false);
      setFeedback('Scanner stopped.');
    } catch (err) {
      console.error('Failed to stop QR scanner:', err);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000 // Accept cached location up to 30 seconds old
        }
      );
    });
  };

  const handleScan = async (qrData) => {
    // Rate limiting - prevent scans within 3 seconds
    const now = Date.now();
    if (lastScanTime && now - lastScanTime < 3000) {
      return;
    }
    setLastScanTime(now);

    try {
      setFeedback('Getting location for security validation...');
      setIsGettingLocation(true);

      // Get current location for security validation
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      setLocationError(null);

      setFeedback('Processing QR code with location validation...');
      setIsScanning(false);

      const result = await apiClient.post('/qr/validate-and-checkin', {
        qr_token: qrData,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        device_fingerprint: navigator.userAgent + window.innerWidth + window.innerHeight + navigator.language,
        device_name: navigator.platform || 'Unknown Device'
      });

      if (result && result.success) {
        setFeedback(`✅ Check-in successful! Welcome to ${result.data.classInfo?.courseName || 'class'}. Location verified.`);
          // Play success sound if available
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Check-in successful. Location verified.');
            window.speechSynthesis.speak(utterance);
          }
          // Vibrate for success
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        } else {
          setFeedback(`❌ Check-in failed: ${result.message}`);
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      } else {
        setFeedback(`❌ Check-in failed: ${result?.message || 'Unknown error'}`);
        // Vibrate for error
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    } catch (err) {
      console.error('Error during check-in:', err);
      if (err.message.includes('geolocation')) {
        setLocationError('Location access denied. Please enable location services for secure check-in.');
        setFeedback('❌ Location access required for check-in. Please enable GPS and try again.');
      } else {
        setFeedback('❌ Error during check-in. Please try again.');
      }
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } finally {
      setIsGettingLocation(false);
      // Auto-restart scanning after feedback
      setTimeout(() => {
        if (scanner && !isScanning) {
          startScanning();
        }
      }, 4000); // Slightly longer delay for location-based check-ins
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">📸 QR Code Scanner</h1>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {connected ? 'Real-time active' : 'Connecting...'}
            </div>
          </div>

          {/* Location Status */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              location ? 'bg-green-100 text-green-800' : locationError ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                location ? 'bg-green-500' : locationError ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              {isGettingLocation ? 'Getting location...' :
               location ? `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` :
               locationError ? 'Location access denied' : 'Location required for check-in'}
            </div>
            {location && (
              <div className="text-xs text-gray-500">
                Accuracy: ±{Math.round(location.accuracy)}m
              </div>
            )}
          </div>

          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full border-2 border-gray-200 rounded-lg"
              style={{ maxHeight: '300px' }}
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">Camera paused</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  ▶️ Start Scanning
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  ⏹️ Stop Scanning
                </button>
              )}
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg text-center text-sm font-medium ${
                feedback.includes('successful') ? 'bg-green-50 text-green-800 border border-green-200' :
                feedback.includes('failed') || feedback.includes('Error') ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {feedback}
              </div>
            )}

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>🔒 Secure check-in requires your location to verify you're in class.</p>
              <p>Point your camera at a QR code to check in. Codes expire in 30-40 seconds.</p>
              {lastScanTime && (
                <p>Last scan: {new Date(lastScanTime).toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
