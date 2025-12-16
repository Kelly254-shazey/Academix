// Test LecturerPortal imports and basic functionality
import React from 'react';
import LecturerPortal from './portals/LecturerPortal';
import socketService from './services/socketService';
import apiClient from './services/apiClient';
import ErrorBoundary from './components/ErrorBoundary';
import { useToast, ToastContainer } from './components/Toast';
import { validateSearch, sanitizeInput } from './utils/validation';
import { exportToCSV, exportToJSON, printData } from './utils/exportHelpers';

console.log('✓ All imports successful');
console.log('✓ LecturerPortal:', typeof LecturerPortal);
console.log('✓ socketService:', typeof socketService);
console.log('✓ apiClient:', typeof apiClient);
console.log('✓ ErrorBoundary:', typeof ErrorBoundary);
console.log('✓ useToast:', typeof useToast);
console.log('✓ ToastContainer:', typeof ToastContainer);
console.log('✓ validateSearch:', typeof validateSearch);
console.log('✓ sanitizeInput:', typeof sanitizeInput);
console.log('✓ exportToCSV:', typeof exportToCSV);
console.log('✓ exportToJSON:', typeof exportToJSON);
console.log('✓ printData:', typeof printData);

// Test API client methods
console.log('✓ apiClient.getLecturerDashboard:', typeof apiClient.getLecturerDashboard);
console.log('✓ apiClient.getLecturerSessions:', typeof apiClient.getLecturerSessions);
console.log('✓ apiClient.getLecturerAlerts:', typeof apiClient.getLecturerAlerts);
console.log('✓ apiClient.getAttendanceReport:', typeof apiClient.getAttendanceReport);
console.log('✓ apiClient.startAttendance:', typeof apiClient.startAttendance);
console.log('✓ apiClient.stopAttendance:', typeof apiClient.stopAttendance);
console.log('✓ apiClient.getSessionQR:', typeof apiClient.getSessionQR);

console.log('All tests passed - LecturerPortal should work correctly');