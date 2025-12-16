import React, { useEffect, useState } from 'react';
import { QrCode, RefreshCw, Download, Copy } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function QRCodePage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Live countdown timer
  useEffect(() => {
    if (!qrCode?.expiresAt) return;

    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(qrCode.expiresAt);
      const diff = expiry - now;
      setCountdown(Math.max(0, Math.floor(diff / 1000)));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [qrCode?.expiresAt]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get('/api/lecturer/classes');
      if (result.success) {
        setSessions(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch sessions');
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (classId) => {
    try {
      setGenerating(true);
      setError(null);

      const result = await apiClient.post(`/api/qr/generate`, {
        class_id: classId
      });
      if (result.success) {
        setQrCode(result.data);
        setSelectedSession(classId);
        fetchSessions();
      } else {
        throw new Error(result.message || 'Failed to generate QR code');
      }
    } catch (err) {
      console.error('Error generating QR:', err);
      setError('Failed to generate QR code: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const refreshQR = async () => {
    if (selectedSession) {
      await generateQR(selectedSession);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQR = () => {
    if (qrCode?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCode.qrCodeUrl;
      link.download = `qr-${selectedSession}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimeRemaining = (expiryTime) => {
    if (!expiryTime) return 'N/A';
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔲 QR Code Management</h1>
          <p className="text-gray-600 mt-1">Generate and manage QR codes for attendance sessions</p>
        </div>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Sessions</h2>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Upcoming Sessions</h3>
              <p className="mt-2 text-gray-600">All your sessions are completed or cancelled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedSession === session.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {session.course_code} - {session.course_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(session.session_date).toLocaleDateString()} • {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      {session.qr_expires_at ? (
                        <div className="text-sm">
                          <p className="text-green-600 font-medium">Active</p>
                          <p className="text-gray-500">{getTimeRemaining(session.qr_expires_at)}</p>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-orange-600 font-medium">No QR</p>
                          <p className="text-gray-500">Generate needed</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSession === session.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateQR(session.id);
                        }}
                        disabled={generating}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {generating ? 'Generating...' : 'Generate QR'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code</h2>

          {selectedSession && qrCode ? (
            <div className="space-y-4">
              {/* QR Code Image */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img
                    src={qrCode.qrCodeUrl}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Expiration Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>QR Code Validity</span>
                  <span>{countdown === 0 ? 'Expired' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')} remaining`}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      countdown === 0 ? 'bg-red-500' :
                      countdown <= 10 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(0, (countdown / 35) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  🔒 For security, QR codes expire quickly to prevent sharing
                </p>
              </div>

              {/* QR Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Session Token:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-white px-2 py-1 rounded border font-mono">
                      {qrCode.token}
                    </code>
                    <button
                      onClick={() => copyToClipboard(qrCode.token)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Copy token"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Expires:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(qrCode.expiresAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Time Remaining:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      countdown === 0 ? 'text-red-600' :
                      countdown <= 10 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {countdown === 0 ? 'EXPIRED' : `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`}
                    </span>
                    {countdown > 0 && countdown <= 10 && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={refreshQR}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh QR
                </button>
                <button
                  onClick={downloadQR}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <QrCode className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No QR Code Selected</h3>
              <p className="mt-2 text-gray-600">Select a session from the list to generate or view its QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}