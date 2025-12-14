import React, { useState } from 'react';
import apiClient from '../../utils/apiClient';

export default function LecturerControls({ classId, onStart, onDelay, onCancel, onChangeRoom }){
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAction = (act) => {
    setAction(act);
    setConfirmOpen(true);
  };

  const confirm = async () => {
    if (!classId) {
      alert('No class selected');
      return;
    }

    try {
      setLoading(true);
      let endpoint = '';
      
      switch(action) {
        case 'start':
          endpoint = `/api/lecturer/classes/${classId}/start`;
          break;
        case 'delay':
          endpoint = `/api/lecturer/classes/${classId}/delay`;
          break;
        case 'cancel':
          endpoint = `/api/lecturer/classes/${classId}/cancel`;
          break;
        default:
          return;
      }

      const result = await apiClient.post(endpoint, {});
      if (result.success) {
        setConfirmOpen(false);
        if(action === 'start') onStart?.();
        if(action === 'delay') onDelay?.();
        if(action === 'cancel') onCancel?.();
        alert(`Class ${action} successfully`);
      } else {
        alert(result.message || 'Action failed');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  const actionButtons = [
    { label: 'Start Class', icon: '▶️', action: 'start', color: 'from-green-500 to-green-600', handler: () => handleAction('start') },
    { label: 'Delay', icon: '⏸️', action: 'delay', color: 'from-yellow-500 to-yellow-600', handler: () => handleAction('delay') },
    { label: 'Cancel', icon: '⛔', action: 'cancel', color: 'from-red-500 to-red-600', handler: () => handleAction('cancel') },
    { label: 'Change Room', icon: '🏢', action: 'room', color: 'from-blue-500 to-blue-600', handler: onChangeRoom }
  ];

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 sm:px-5 md:px-6 py-3 sm:py-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Quick Actions
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-5 md:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {actionButtons.map((btn) => (
            <button
              key={btn.action}
              onClick={btn.handler}
              disabled={loading || !classId}
              className={`px-3 sm:px-4 py-3 sm:py-3 bg-gradient-to-r ${btn.color} text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-lg">{btn.icon}</span>
              <span className="hidden sm:inline">{btn.label}</span>
              <span className="sm:hidden text-xs">{btn.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Confirmation Dialog */}
        {confirmOpen && (
          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200 shadow-sm">
            <p className="text-sm sm:text-base font-semibold text-gray-800">⚠️ Confirm Action</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">Are you sure you want to <span className="font-bold text-gray-700">{action}</span> this class?</p>
            <div className="mt-4 flex gap-2 sm:gap-3">
              <button 
                onClick={confirm}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? '⏳ Processing...' : '✓ Confirm'}
              </button>
              <button 
                onClick={()=>setConfirmOpen(false)}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
