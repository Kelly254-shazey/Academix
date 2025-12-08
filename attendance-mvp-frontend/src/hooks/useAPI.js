import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * useClasses Hook
 * Manages class-related API calls
 */
export const useClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/classes`);
      setClasses(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch classes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/classes/student/my-classes`);
      setClasses(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch your classes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLecturerClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/classes/lecturer/my-classes`);
      setClasses(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch your classes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClassById = useCallback(async (classId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/classes/${classId}`);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch class');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClass = useCallback(async (courseCode, courseName, unitCode, semester) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/classes`, {
        courseCode, courseName, unitCode, semester
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rescheduleClass = useCallback(async (classId, dayOfWeek, startTime, endTime) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/classes/${classId}/reschedule`, {
        dayOfWeek, startTime, endTime
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reschedule class');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelClass = useCallback(async (classId, reason) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/classes/${classId}/cancel`, { reason });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel class');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    classes,
    loading,
    error,
    getAllClasses,
    getStudentClasses,
    getLecturerClasses,
    getClassById,
    createClass,
    rescheduleClass,
    cancelClass
  };
};

/**
 * useAttendance Hook
 * Manages attendance-related API calls
 */
export const useAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const markAttendance = useCallback(async (studentId, classId, status, notes = '') => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/attendance/mark`, {
        studentId, classId, status, notes
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClassAttendance = useCallback(async (classId, startDate, endDate) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/attendance/class/${classId}`, {
        params: { startDate, endDate }
      });
      setAttendance(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentAttendance = useCallback(async (studentId, classId = null) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/attendance/student/${studentId}`, {
        params: { classId }
      });
      setAttendance(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch attendance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAttendanceStats = useCallback(async (studentId, classId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/attendance/stats/${studentId}/${classId}`);
      setStats(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch stats');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    attendance,
    stats,
    loading,
    error,
    markAttendance,
    getClassAttendance,
    getStudentAttendance,
    getAttendanceStats
  };
};

/**
 * useAnalytics Hook
 * Manages analytics and reporting API calls
 */
export const useAnalytics = () => {
  const [report, setReport] = useState(null);
  const [trends, setTrends] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStudentReport = useCallback(async (studentId, classId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/student/${studentId}/${classId}`);
      setReport(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClassReport = useCallback(async (classId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/class/${classId}`);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch report');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWeeklyTrends = useCallback(async (classId, weeks = 4) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/trends/${classId}`, {
        params: { weeks }
      });
      setTrends(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch trends');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLecturerOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/lecturer/overview`);
      setOverview(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch overview');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlatformOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/admin/overview`);
      setOverview(response.data.data);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch overview');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportAsCSV = useCallback(async (classId) => {
    try {
      const response = await axios.get(`${API_URL}/analytics/export/csv/${classId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_report.csv');
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export CSV');
      throw err;
    }
  }, []);

  const exportAsPDF = useCallback(async (classId) => {
    try {
      const response = await axios.get(`${API_URL}/analytics/export/pdf/${classId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export PDF');
      throw err;
    }
  }, []);

  return {
    report,
    trends,
    overview,
    loading,
    error,
    getStudentReport,
    getClassReport,
    getWeeklyTrends,
    getLecturerOverview,
    getPlatformOverview,
    exportAsCSV,
    exportAsPDF
  };
};
