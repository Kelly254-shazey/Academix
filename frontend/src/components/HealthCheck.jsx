import React, { useState, useEffect } from 'react';

const HealthCheck = () => {
  const [status, setStatus] = useState({
    frontend: 'checking',
    backend: 'checking',
    socket: 'checking'
  });

  useEffect(() => {
    // Frontend is obviously working if this component renders
    setStatus(prev => ({ ...prev, frontend: 'healthy' }));

    // Check backend connection
    const checkBackend = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002/api';
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          setStatus(prev => ({ ...prev, backend: 'healthy' }));
        } else {
          setStatus(prev => ({ ...prev, backend: 'error' }));
        }
      } catch (error) {
        setStatus(prev => ({ ...prev, backend: 'error' }));
      }
    };

    // Check socket connection (disabled)
    const checkSocket = async () => {
      setStatus(prev => ({ ...prev, socket: 'disabled' }));
    };

    checkBackend();
    checkSocket();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'error': return '❌';
      case 'checking': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 border z-50">
      <h3 className="font-bold text-sm mb-2">System Health</h3>
      <div className="space-y-1 text-sm">
        <div className={`flex items-center gap-2 ${getStatusColor(status.frontend)}`}>
          <span>{getStatusIcon(status.frontend)}</span>
          <span>Frontend: {status.frontend}</span>
        </div>
        <div className={`flex items-center gap-2 ${getStatusColor(status.backend)}`}>
          <span>{getStatusIcon(status.backend)}</span>
          <span>Backend: {status.backend}</span>
        </div>
        <div className={`flex items-center gap-2 ${getStatusColor(status.socket)}`}>
          <span>{getStatusIcon(status.socket)}</span>
          <span>Socket: {status.socket}</span>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;