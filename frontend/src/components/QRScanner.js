import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axiosConfig';

// Props:
// - classId: id of the class
// - sessionId: id of the session
// - onSuccess: optional callback after a successful scan
export default function QRScanner({ classId, sessionId, onSuccess }) {
  const containerRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = { fps: 10, qrbox: 250 };
    const html5QrCode = new Html5Qrcode(containerRef.current.id);
    qrScannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((devices) => {
        const cameraId = devices && devices.length ? devices[0].id : null;
        if (!cameraId) {
          console.error('No cameras found for QR scanner');
          return;
        }
        html5QrCode.start(
          cameraId,
          config,
          (decodedText, decodedResult) => {
            // decodedText is the scanned QR payload
            console.log('QR decoded:', decodedText);
            // Expect QR payload to be JSON or plain student id or signature
            let payload;
            try {
              payload = JSON.parse(decodedText);
            } catch (e) {
              payload = { qr_signature: decodedText };
            }

            // Build body to POST to backend
            const body = {
              studentId: payload.studentId || payload.userId || null,
              qr_signature: payload.qr_signature || payload.signature || payload.sig || decodedText,
              latitude: null,
              longitude: null,
              browser_fingerprint: navigator.userAgent
            };

            // Send to backend (backend mounts classes routes at `/classes`)
            api.post(`/classes/${classId}/sessions/${sessionId}/scan`, body)
              .then((resp) => {
                console.log('Scan recorded:', resp.data);
                if (onSuccess) onSuccess(resp.data);
              })
              .catch((err) => {
                console.error('Failed to send scan to backend:', err.response ? err.response.data : err.message);
              });
          },
          (errorMessage) => {
            // parse errors, ignore for now
          }
        ).catch((err) => {
          console.error('Failed to start QR scanner:', err);
        });
      })
      .catch((err) => {
        console.error('Error fetching cameras:', err);
      });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current.clear();
        }).catch(() => {});
      }
    };
  }, [classId, sessionId, onSuccess]);

  return (
    <div>
      <div id="qr-reader" ref={containerRef} style={{ width: '100%' }} />
      <p>Point your camera at the class QR code to record attendance.</p>
    </div>
  );
}
