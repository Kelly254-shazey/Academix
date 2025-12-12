import React, { useState } from 'react';
import QRCode from 'react-qr-code';

export default function LecturerQRDisplay({ token='ABC123', expiry='00:15:00', onRotate }){
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(String(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-5 md:px-6 py-3 sm:py-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">🔐</span>
          Session QR Code
        </h3>
      </div>

      {/* QR Display */}
      <div className="p-4 sm:p-5 md:p-6 flex flex-col items-center">
        {/* QR Code Box */}
        <div className="p-3 sm:p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-4 sm:mb-6">
          <QRCode value={String(token)} size={180} level="H" includeMargin={true} />
        </div>

        {/* Expiry Timer */}
        <div className="w-full bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 sm:p-4 border border-orange-200 mb-4">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">⏱️ Session Expires In</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1 font-mono">{expiry}</p>
          <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-red-500 animate-pulse"></div>
          </div>
        </div>

        {/* Token Display */}
        <div className="w-full bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 mb-4">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">Token</p>
          <p className="text-sm sm:text-base font-mono font-bold text-gray-800 mt-1 break-all">{token}</p>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3">
          <button 
            onClick={onRotate} 
            className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Rotate</span>
          </button>
          <button 
            onClick={handleCopy} 
            className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
