import React, { useState } from 'react';

export default function QRCheckInPanel({ lastCheckIn }){
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const openScanner = () => { setOpen(true); setFeedback(null); };
  const closeScanner = () => { setOpen(false); setFeedback(null); };

  // Real scanner is provided by the dedicated QR scanner page/component.
  // Remove development mock actions to avoid fake check-ins in production.

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">QR Check-In</h3>
      </div>

      <div className="space-y-3">
        <button onClick={openScanner} className="px-4 py-2 bg-indigo-600 text-white rounded">Open QR Scanner</button>
        {open && (
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Scanner modal is disabled in this build. Use the QR scanner page for live check-ins.</p>
            <div className="mt-2">
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
