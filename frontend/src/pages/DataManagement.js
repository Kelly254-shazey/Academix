import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './DataManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function DataManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [auditLog, setAuditLog] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [formData, setFormData] = useState({
    studentId: '',
    lectureId: '',
    status: 'present',
    reason: ''
  });
  const [bulkData, setBulkData] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check authorization
  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }
    fetchAuditLog();
  }, [user]);

  const fetchAuditLog = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/audit-log`);
      const data = await response.json();
      if (data.success) {
        setAuditLog(data.auditLog);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.studentId.trim()) {
      setMessage('❌ Student ID is required');
      return;
    }
    if (!formData.lectureId || !formData.lectureId.trim()) {
      setMessage('❌ Lecture ID is required');
      return;
    }
    if (!formData.status || !formData.status.trim()) {
      setMessage('❌ Status is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/data/attendance/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Attendance record updated successfully');
        setFormData({ studentId: '', lectureId: '', status: 'present', reason: '' });
        fetchAuditLog();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Failed to update record');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (!bulkData || !bulkData.trim()) {
      setMessage('❌ No data provided. Format: studentId,lectureId,status');
      return;
    }

    setLoading(true);
    try {
      // Parse bulk data (expected format: studentId,lectureId,status per line)
      const records = bulkData.split('\n')
        .map(line => {
          const [studentId, lectureId, status] = line.trim().split(',');
          return { studentId: studentId?.trim(), lectureId: lectureId?.trim(), status: status?.trim() };
        })
        .filter(r => r.studentId && r.lectureId && r.status);

      if (records.length === 0) {
        setMessage('No valid records found. Format: studentId,lectureId,status');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/data/attendance/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.data.recordCount} records updated successfully`);
        setBulkData('');
        fetchAuditLog();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Failed to update records');
      }
    } catch (error) {
      console.error('Error bulk updating:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // handleDeleteStudent feature disabled - not exposed in UI yet
  // Uncomment when ready to implement student deletion UI
  // const handleDeleteStudent = async (studentId) => {
  //   if (!window.confirm('Are you sure you want to delete this student record? This action cannot be undone.')) {
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const response = await fetch(`${API_URL}/admin/data/student/delete`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ studentId, reason: 'Admin deletion' })
  //     });
  //     const data = await response.json();
  //     if (data.success) {
  //       setMessage('✅ Student record deleted successfully');
  //       fetchAuditLog();
  //       setTimeout(() => setMessage(''), 3000);
  //     } else {
  //       setMessage('❌ Failed to delete record');
  //     }
  //   } catch (error) {
  //     console.error('Error deleting student:', error);
  //     setMessage('❌ Error: ' + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleExportData = async () => {
    if (selectedRecords.length === 0) {
      setMessage('Please select records to export');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/data/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedRecords, dataType: 'attendance' })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Data exported successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="unauthorized-access">
        <p>⛔ You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="data-management">
      <div className="management-header">
        <h1>🔧 Data Management</h1>
        <p>Manage and manipulate student records, attendance data, and audit logs</p>
      </div>

      {message && (
        <div className={`notification ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="management-tabs">
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          📋 Update Attendance
        </button>
        <button
          className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          📦 Bulk Update
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📊 Audit Log
        </button>
        <button
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          💾 Export Data
        </button>
      </div>

      <div className="management-content">
        {/* Update Single Attendance Record */}
        {activeTab === 'attendance' && (
          <div className="tab-panel">
            <h2>Update Single Attendance Record</h2>
            <form onSubmit={handleUpdateAttendance} className="management-form">
              <div className="form-group">
                <label>Student ID *</label>
                <input
                  type="text"
                  placeholder="e.g., STU001"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lecture ID *</label>
                <input
                  type="text"
                  placeholder="e.g., lec_001"
                  value={formData.lectureId}
                  onChange={(e) => setFormData({ ...formData, lectureId: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="present">✅ Present</option>
                  <option value="absent">❌ Absent</option>
                  <option value="late">⏰ Late</option>
                  <option value="excused">📋 Excused</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  placeholder="Optional reason for update..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows="3"
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '⏳ Updating...' : '✅ Update Record'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Update */}
        {activeTab === 'bulk' && (
          <div className="tab-panel">
            <h2>Bulk Update Attendance Records</h2>
            <div className="bulk-info">
              <p>📝 Format: studentId,lectureId,status (one record per line)</p>
              <p>📌 Example:</p>
              <code>
                STU001,lec_001,present<br/>
                STU002,lec_001,absent<br/>
                STU003,lec_002,late
              </code>
            </div>

            <form onSubmit={handleBulkUpdate} className="management-form">
              <div className="form-group full-width">
                <label>Records to Update *</label>
                <textarea
                  placeholder="Paste your data here (studentId,lectureId,status per line)"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows="10"
                  className="bulk-textarea"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '⏳ Processing...' : '📦 Bulk Update'}
              </button>
            </form>
          </div>
        )}

        {/* Audit Log */}
        {activeTab === 'audit' && (
          <div className="tab-panel">
            <h2>Audit Log</h2>
            <div className="audit-log">
              {auditLog.length === 0 ? (
                <p className="no-data">No audit log entries yet</p>
              ) : (
                <div className="log-table">
                  <div className="log-header">
                    <div className="log-col action">Action</div>
                    <div className="log-col target">Target</div>
                    <div className="log-col time">Timestamp</div>
                    <div className="log-col admin">Admin</div>
                  </div>
                  {auditLog.slice(0, 50).map((log) => (
                    <div key={log.id} className="log-row">
                      <div className="log-col action">{log.action}</div>
                      <div className="log-col target">
                        {log.targetStudentId || (log.recordCount ? `${log.recordCount} records` : '-')}
                      </div>
                      <div className="log-col time">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      <div className="log-col admin">{log.adminId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Data */}
        {activeTab === 'export' && (
          <div className="tab-panel">
            <h2>Export Data</h2>
            <div className="export-panel">
              <div className="export-info">
                <h3>📊 Export Options</h3>
                <p>Select student records to export as CSV</p>
              </div>

              <div className="export-options">
                <div className="export-option">
                  <input
                    type="checkbox"
                    id="all"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRecords(['STU001', 'STU002', 'STU003', 'STU004', 'STU005']);
                      } else {
                        setSelectedRecords([]);
                      }
                    }}
                  />
                  <label htmlFor="all">Select All Students</label>
                </div>

                {['STU001', 'STU002', 'STU003', 'STU004', 'STU005'].map((id) => (
                  <div key={id} className="export-option">
                    <input
                      type="checkbox"
                      id={id}
                      checked={selectedRecords.includes(id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecords([...selectedRecords, id]);
                        } else {
                          setSelectedRecords(selectedRecords.filter(r => r !== id));
                        }
                      }}
                    />
                    <label htmlFor={id}>Student {id}</label>
                  </div>
                ))}
              </div>

              <button
                onClick={handleExportData}
                className="export-btn"
                disabled={loading || selectedRecords.length === 0}
              >
                {loading ? '⏳ Exporting...' : '💾 Export as CSV'}
              </button>
              {selectedRecords.length > 0 && (
                <p className="selected-info">
                  ✅ {selectedRecords.length} student(s) selected
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataManagement;
