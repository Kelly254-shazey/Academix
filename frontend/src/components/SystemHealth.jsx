import React, { useState, useEffect } from 'react';
import healthCheckService from '../services/healthCheck';

const SystemHealth = () => {
  const [healthStatus, setHealthStatus] = useState({
    backend: 'unknown',
    socket: 'unknown',
    overall: 'unknown',
    lastCheck: null
  });

  useEffect(() => {
    // Subscribe to health status updates
    const unsubscribe = healthCheckService.subscribe((status) => {
      setHealthStatus(status);
    });

    // Get initial status
    setHealthStatus(healthCheckService.getStatus());

    return unsubscribe;
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
        System Health
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px' }}>Frontend:</span>
          <span style={{ color: '#10b981' }}>✅ healthy</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px' }}>Backend:</span>
          <span style={{ color: getStatusColor(healthStatus.backend) }}>
            {getStatusIcon(healthStatus.backend)} {healthStatus.backend}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px' }}>Socket:</span>
          <span style={{ color: getStatusColor(healthStatus.socket) }}>
            {getStatusIcon(healthStatus.socket)} {healthStatus.socket}
          </span>
        </div>
      </div>
      
      {healthStatus.lastCheck && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '10px', 
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '4px'
        }}>
          Last check: {new Date(healthStatus.lastCheck).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;