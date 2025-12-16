const axios = require('axios');
const QRCode = require('qrcode');
const baseURL = process.env.API_BASE_URL || 'http://localhost:5003';

// Active sessions storage
const activeSessions = new Map();
const sessionAnalytics = new Map();

class LecturerService {
  async getLecturerOverview(lecturerId) {
    try {
      // Get real attendance analysis
      const analysisResponse = await axios.get(`${baseURL}/api/feedback/attendance/analysis`);
      const analysis = analysisResponse.data.analysis || {};
      
      // Calculate live metrics
      const totalStudents = Object.keys(analysis).length;
      const presentStudents = Object.values(analysis).filter(s => s.attendancePercentage >= 75).length;
      const absentStudents = totalStudents - presentStudents;
      
      // Get active session
      const activeSession = Array.from(activeSessions.values())[0] || null;
      
      // Generate alerts for low attendance
      const alertsSummary = Object.entries(analysis)
        .filter(([studentId, data]) => data.attendancePercentage < 60)
        .slice(0, 3)
        .map(([studentId, data]) => ({
          studentName: `Student ${studentId}`,
          message: `Low attendance: ${data.attendancePercentage}%`
        }));
      
      return {
        success: true,
        data: {
          liveCount: presentStudents,
          absentCount: absentStudents,
          totalStudents,
          averageAttendance: totalStudents > 0 ? 
            (Object.values(analysis).reduce((sum, s) => sum + s.attendancePercentage, 0) / totalStudents).toFixed(1) : 0,
          activeSession,
          alertsSummary,
          analytics: {
            criticalStudents: Object.values(analysis).filter(s => s.status === 'Critical').length,
            warningStudents: Object.values(analysis).filter(s => s.status === 'Warning').length,
            goodStudents: Object.values(analysis).filter(s => s.status === 'Good').length
          }
        }
      };
    } catch (error) {
      console.error('Error getting lecturer overview:', error);
      return { success: false, error: error.message };
    }
  }

  async getLecturerSessions(lecturerId) {
    try {
      const sessions = [];
      const today = new Date().toISOString().split('T')[0];
      
      // Add active sessions
      activeSessions.forEach((session, id) => {
        sessions.push({
          id,
          className: session.className,
          date: session.date,
          startTime: session.startTime,
          presentCount: session.presentCount || 0,
          absentCount: session.absentCount || 0,
          status: 'active'
        });
      });
      
      // Add sample completed sessions if none active
      if (sessions.length === 0) {
        sessions.push(
          {
            id: 'cs101_' + Date.now(),
            className: 'Computer Science 101',
            date: today,
            startTime: '10:00 AM',
            presentCount: 0,
            absentCount: 0,
            status: 'pending'
          },
          {
            id: 'ds201_' + Date.now(),
            className: 'Data Structures',
            date: today,
            startTime: '2:00 PM',
            presentCount: 0,
            absentCount: 0,
            status: 'pending'
          }
        );
      }
      
      return { success: true, data: sessions };
    } catch (error) {
      console.error('Error getting lecturer sessions:', error);
      return { success: false, error: error.message };
    }
  }

  async getLecturerAlerts(lecturerId) {
    try {
      const analysisResponse = await axios.get(`${baseURL}/api/feedback/attendance/analysis`);
      const analysis = analysisResponse.data.analysis || {};
      
      const alerts = [];
      
      // Generate alerts for critical attendance
      Object.entries(analysis).forEach(([studentId, data]) => {
        if (data.status === 'Critical') {
          alerts.push({
            id: `alert_critical_${studentId}`,
            title: 'Critical Attendance Alert',
            message: `Student ${studentId} has ${data.attendancePercentage}% attendance`,
            severity: 'critical',
            timestamp: new Date().toISOString(),
            studentName: `Student ${studentId}`
          });
        } else if (data.status === 'Warning') {
          alerts.push({
            id: `alert_warning_${studentId}`,
            title: 'Low Attendance Warning',
            message: `Student ${studentId} has ${data.attendancePercentage}% attendance`,
            severity: 'high',
            timestamp: new Date().toISOString(),
            studentName: `Student ${studentId}`
          });
        }
      });
      
      return { success: true, data: alerts };
    } catch (error) {
      console.error('Error getting lecturer alerts:', error);
      return { success: true, data: [] };
    }
  }

  async getLecturerClasses(lecturerId) {
    return this.getLecturerSessions(lecturerId);
  }

  async getLecturerReports(lecturerId, startDate, endDate, reportType) {
    try {
      const analysisResponse = await axios.get(`${baseURL}/api/feedback/attendance/analysis`);
      const analysis = analysisResponse.data.analysis || {};
      
      const totalStudents = Object.keys(analysis).length;
      const averageAttendance = totalStudents > 0 ? 
        Object.values(analysis).reduce((sum, s) => sum + s.attendancePercentage, 0) / totalStudents : 0;
      
      return { 
        success: true, 
        data: {
          reportType: reportType || 'all',
          period: `${startDate || 'All time'} to ${endDate || 'Present'}`,
          summary: {
            totalSessions: Object.values(analysis).reduce((sum, s) => sum + s.total, 0),
            averageAttendance: averageAttendance.toFixed(1),
            totalStudents,
            criticalStudents: Object.values(analysis).filter(s => s.status === 'Critical').length,
            warningStudents: Object.values(analysis).filter(s => s.status === 'Warning').length
          },
          details: Object.entries(analysis).map(([studentId, data]) => ({
            studentId,
            totalSessions: data.total,
            presentSessions: data.present,
            absentSessions: data.absent,
            attendanceRate: data.attendancePercentage,
            status: data.status
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async startClassSession(lecturerId, classId) {
    try {
      const sessionId = `session_${Date.now()}`;
      const session = {
        id: sessionId,
        classId,
        className: `Class ${classId}`,
        lecturerId,
        status: 'active',
        startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString(),
        presentCount: 0,
        absentCount: 0
      };
      
      activeSessions.set(sessionId, session);
      
      return {
        success: true,
        data: {
          sessionId,
          classId,
          status: 'active',
          startTime: session.startTime
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stopClassSession(lecturerId, sessionId) {
    try {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.status = 'completed';
        session.endTime = new Date().toISOString();
        activeSessions.delete(sessionId);
      }
      
      return {
        success: true,
        data: {
          sessionId,
          status: 'completed',
          endTime: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSessionQR(sessionId) {
    try {
      const session = activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const qrToken = `qr_${sessionId}_${Date.now()}`;
      const qrData = {
        sessionId,
        token: qrToken,
        timestamp: Date.now(),
        className: session.className,
        lecturerId: session.lecturerId
      };
      
      // Generate actual QR code
      const qrString = JSON.stringify(qrData);
      const qrImage = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        success: true,
        data: {
          qrImage,
          token: qrToken,
          expiresIn: 25,
          sessionId,
          qrData: qrString
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Validate QR code
  validateQRCode(qrData) {
    try {
      const data = JSON.parse(qrData);
      const { sessionId, token, timestamp } = data;
      
      // Check if session exists
      const session = activeSessions.get(sessionId);
      if (!session) {
        return { valid: false, error: 'Session not found or expired' };
      }
      
      // Check if QR is not too old (25 seconds)
      const now = Date.now();
      if (now - timestamp > 25000) {
        return { valid: false, error: 'QR code expired' };
      }
      
      return { valid: true, sessionId, session };
    } catch (error) {
      return { valid: false, error: 'Invalid QR code format' };
    }
  }
  
  // Record attendance when QR is scanned
  async recordAttendance(sessionId, studentId, status = 'present') {
    try {
      const session = activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Record in attendance system
      await axios.post(`${baseURL}/api/feedback/attendance/record`, {
        studentId,
        lectureId: sessionId,
        courseName: session.className,
        status,
        timestamp: new Date().toISOString()
      });
      
      // Update session counts
      if (status === 'present') {
        session.presentCount = (session.presentCount || 0) + 1;
      } else {
        session.absentCount = (session.absentCount || 0) + 1;
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Create new class
  async createClass(lecturerId, classData) {
    try {
      const newClass = {
        id: `class_${Date.now()}`,
        lecturerId,
        name: classData.name,
        time: classData.time,
        room: classData.room,
        expectedStudents: classData.expectedStudents || 0,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };
      
      return { success: true, data: newClass };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Update student CATs (Continuous Assessment Tests)
  async updateStudentCAT(lecturerId, studentId, catData) {
    try {
      const catRecord = {
        id: `cat_${Date.now()}`,
        studentId,
        lecturerId,
        courseName: catData.courseName,
        catNumber: catData.catNumber,
        score: catData.score,
        maxScore: catData.maxScore || 100,
        date: catData.date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      };
      
      return { success: true, data: catRecord };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Get lecturer permissions
  getLecturerPermissions(lecturerId) {
    return {
      canCreateClasses: true,
      canUpdateGrades: true,
      canViewReports: true,
      canManageAttendance: true,
      canSendNotifications: true
    };
  }
}

// Export active sessions for other modules
module.exports = new LecturerService();
module.exports.activeSessions = activeSessions;