import React, { useState } from 'react';
import useSocket from '../../hooks/useSocket';

export default function QRCheckInPanel({ lastCheckIn }){
  const socketRef = useSocket();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const openScanner = () => setOpen(true);
  const closeScanner = () => setOpen(false);

  // Placeholder handlers: real scanner is in QRScanner page/component
  const mockScanSuccess = () => {
    setFeedback({ type: 'success', message: 'Check-in recorded' });
    if (socketRef.current) socketRef.current.emit('student-checkin', { timestamp: Date.now() });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">QR Check-In</h3>
      </div>

      <div className="space-y-3">
        <button onClick={openScanner} className="px-4 py-2 bg-indigo-600 text-white rounded">Open QR Scanner</button>
        {open && (
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Scanner modal (use full scanner page for production)</p>
            <div className="mt-2 flex gap-2">
              <button onClick={mockScanSuccess} className="px-3 py-1 bg-green-500 text-white rounded">Mock Success</button>
              <button onClick={() => setFeedback({type:'error', message:'Invalid QR'})} className="px-3 py-1 bg-red-500 text-white rounded">Mock Error</button>
              <button onClick={closeScanner} className="px-3 py-1 bg-gray-200 rounded">Close</button>
            </div>
          </div>
        )}

        {feedback && (
          <div className={`p-2 rounded ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {feedback.message}
          </div>
        )}

        <div className="text-sm text-gray-500">Last check-in: <span className="font-medium">{lastCheckIn || 'No recent check-in'}</span></div>
      </div>
    </div>
  );
}
