const AnalyticsService = require('../services/AnalyticsService');
const { sendSuccess, sendError } = require('../utils/helpers');
const { stringify } = require('csv-stringify/sync');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Analytics Controller
 * Generates reports and analytics
 */

class AnalyticsController {
  /**
   * Get student's attendance report
   */
  static async getStudentReport(req, res, next) {
    try {
      const { studentId, classId } = req.params;

      const report = await AnalyticsService.getStudentReport(studentId, classId);
      if (!report) {
        return sendError(res, 'No attendance data found', 404);
      }

      return sendSuccess(res, report, 'Student report retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get class attendance report
   */
  static async getClassReport(req, res, next) {
    try {
      const { classId } = req.params;

      const report = await AnalyticsService.getClassAttendanceReport(classId);
      return sendSuccess(res, report, 'Class attendance report retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weekly trends
   */
  static async getWeeklyTrends(req, res, next) {
    try {
      const { classId } = req.params;
      const { weeks = 4 } = req.query;

      const trends = await AnalyticsService.getWeeklyTrends(classId, weeks);
      return sendSuccess(res, trends, 'Weekly trends retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lecturer's dashboard overview
   */
  static async getLecturerOverview(req, res, next) {
    try {
      const overview = await AnalyticsService.getLecturerOverview(req.user.id);
      return sendSuccess(res, overview, 'Lecturer overview retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform overview (Admin only)
   */
  static async getPlatformOverview(req, res, next) {
    try {
      const overview = await AnalyticsService.getPlatformOverview();
      return sendSuccess(res, overview, 'Platform overview retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export attendance as CSV
   */
  static async exportAsCSV(req, res, next) {
    try {
      const { classId } = req.params;

      const report = await AnalyticsService.getClassAttendanceReport(classId);
      
      if (!report || report.length === 0) {
        return sendError(res, 'No attendance data to export', 404);
      }

      const csv = stringify(report, {
        header: true,
        columns: {
          id: 'ID',
          first_name: 'First Name',
          last_name: 'Last Name',
          student_number: 'Student Number',
          total_sessions: 'Total Sessions',
          sessions_attended: 'Sessions Attended',
          sessions_missed: 'Sessions Missed',
          attendance_percentage: 'Attendance %'
        }
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export attendance as PDF
   */
  static async exportAsPDF(req, res, next) {
    try {
      const { classId } = req.params;

      const report = await AnalyticsService.getClassAttendanceReport(classId);
      
      if (!report || report.length === 0) {
        return sendError(res, 'No attendance data to export', 404);
      }

      const doc = new PDFDocument();
      const filename = `attendance_report_${classId}_${Date.now()}.pdf`;
      const filepath = path.join('/tmp', filename);

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      // Table headers
      const columnX = [50, 150, 250, 350, 430];
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Name', columnX[0], doc.y);
      doc.text('Student ID', columnX[1], doc.y - 15);
      doc.text('Sessions', columnX[2], doc.y - 15);
      doc.text('Attended', columnX[3], doc.y - 15);
      doc.text('Rate %', columnX[4], doc.y - 15);
      doc.moveDown();

      // Table rows
      doc.font('Helvetica').fontSize(9);
      report.forEach(row => {
        doc.text(`${row.first_name} ${row.last_name}`, columnX[0], doc.y);
        doc.text(row.student_number, columnX[1], doc.y - 12);
        doc.text(row.total_sessions, columnX[2], doc.y - 12);
        doc.text(row.sessions_attended, columnX[3], doc.y - 12);
        doc.text(row.attendance_percentage || '0', columnX[4], doc.y - 12);
        doc.moveDown(12);
      });

      doc.end();

      doc.on('finish', () => {
        res.download(filepath, 'attendance_report.pdf', (err) => {
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        });
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;
