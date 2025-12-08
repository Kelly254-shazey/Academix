/**
 * Logout Confirmation Modal
 * Responsive logout confirmation dialog
 */

import React from 'react';
import './LogoutModal.css';

const LogoutModal = ({ isOpen, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Logout</h2>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p>Are you sure you want to logout?</p>
          <p className="modal-subtext">Your session will end and you'll be redirected to the login page.</p>
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
