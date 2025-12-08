import React, { useRef, useEffect, useState } from 'react';
import { useStudentCheckinMutation } from '../../features/apiSlice';
import QrScanner from 'qr-scanner'; // You'll need to install this library

const QRScanner = () => {
  const videoRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [checkin] = useStudentCheckinMutation();

  useEffect(() => {
    if (videoRef.current && !scanner) {
      const qrScanner = new QrScanner(
        videoRef.current,
        result => handleScan(result.data),
        { highlightScanRegion: true }
      );
      setScanner(qrScanner);
      qrScanner.start();
    }

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [scanner]);

  const handleScan = async (qrData) => {
    try {
      const parsedData = JSON.parse(qrData);
      // Get current location
      navigator.geolocation.getCurrentPosition(async (position) => {
        const checkinData = {
          session_id: parsedData.sessionId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          browser_fingerprint: navigator.userAgent,
        };
        await checkin(checkinData);
        alert('Check-in successful!');
      });
    } catch (error) {
      console.error('Invalid QR code:', error);
      alert('Invalid QR code');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Scan QR Code</h1>
      <video ref={videoRef} className="w-full max-w-md mx-auto border rounded"></video>
    </div>
  );
};

export default QRScanner;
