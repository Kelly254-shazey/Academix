const db = require('../database');
const logger = require('../utils/logger');
const axios = require('axios');

const aiInsightsService = {
  // Predict absenteeism risk
  async predictAbsenteeismRisk(studentId) {
    try {
      // Get student attendance data
      const [attendance] = await db.execute(
        `SELECT 
          COUNT(DISTINCT al.session_id) as total_sessions,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended,
          COUNT(CASE WHEN al.verification_status = 'absent' THEN 1 END) as absences,
          COUNT(CASE WHEN al.verification_status = 'late' THEN 1 END) as lates,
          ROUND(COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) * 100.0 / COUNT(DISTINCT al.session_id), 2) as attendance_percent
        FROM attendance_logs al
        WHERE al.student_id = ?`,
        [studentId]
      );

      const data = attendance[0];

      // Call external ML microservice
      try {
        const mlResponse = await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:5003'}/predict/absenteeism`,
          {
            student_id: studentId,
            total_sessions: data.total_sessions || 0,
            attended: data.attended || 0,
            absences: data.absences || 0,
            lates: data.lates || 0,
            attendance_percent: data.attendance_percent || 0,
          },
          {
            timeout: 5000,
          }
        );

        const prediction = mlResponse.data;

        // Store prediction in database
        await db.execute(
          `INSERT INTO ai_predictions (student_id, prediction_type, prediction_value, prediction_date)
           VALUES (?, ?, ?, CURDATE())
           ON DUPLICATE KEY UPDATE 
           prediction_value = ?, updated_at = CURRENT_TIMESTAMP`,
          [studentId, 'absenteeism_risk', JSON.stringify(prediction), JSON.stringify(prediction)]
        );

        return {
          riskLevel: prediction.risk_level || 'medium',
          riskScore: prediction.risk_score || 0.5,
          factors: prediction.factors || [],
          recommendation: prediction.recommendation || 'Monitor attendance',
        };
      } catch (mlError) {
        logger.warn('AI service unavailable, using fallback prediction:', mlError.message);
        
        // Fallback logic if ML service is down
        const riskScore = 1 - (data.attendance_percent || 0) / 100;
        return {
          riskLevel: riskScore < 0.3 ? 'low' : riskScore < 0.6 ? 'medium' : 'high',
          riskScore,
          factors: ['Low attendance rate'],
          recommendation: 'Improve attendance immediately',
        };
      }
    } catch (error) {
      logger.error('Error predicting absenteeism risk:', error);
      throw error;
    }
  },

  // Get personalized recommendations
  async getRecommendations(studentId) {
    try {
      const recommendations = [];

      // Get student metrics
      const [metrics] = await db.execute(
        `SELECT 
          (SELECT ROUND(AVG(attendance_percent), 2) FROM student_attendance_analytics WHERE student_id = ?) as avg_attendance,
          (SELECT COUNT(*) FROM attendance_logs WHERE student_id = ? AND verification_status = 'late') as late_count,
          (SELECT COUNT(*) FROM attendance_logs WHERE student_id = ? AND verification_status = 'absent') as absent_count
        FROM dual`,
        [studentId, studentId, studentId]
      );

      const m = metrics[0];

      // Low attendance recommendation
      if (m.avg_attendance < 75) {
        recommendations.push({
          type: 'attendance',
          title: 'Improve Attendance',
          message: `Your attendance is at ${m.avg_attendance}%. Aim for 85% or higher.`,
          priority: 'high',
          action: 'Review your schedule and attend all sessions',
        });
      }

      // Punctuality recommendation
      if (m.late_count > 5) {
        recommendations.push({
          type: 'punctuality',
          title: 'Improve Punctuality',
          message: `You've been late ${m.late_count} times. Arrive 5 minutes early.`,
          priority: 'medium',
          action: 'Set reminders before class',
        });
      }

      // Check for at-risk courses
      const [riskCourses] = await db.execute(
        `SELECT c.course_name, saa.attendance_percent
         FROM student_attendance_analytics saa
         JOIN classes c ON saa.class_id = c.id
         WHERE saa.student_id = ? AND saa.attendance_percent < 70
         LIMIT 3`,
        [studentId]
      );

      if (riskCourses.length > 0) {
        riskCourses.forEach(course => {
          recommendations.push({
            type: 'course_intervention',
            title: `Action Needed: ${course.course_name}`,
            message: `Attendance in ${course.course_name} is ${course.attendance_percent}%. Contact your lecturer.`,
            priority: 'high',
            action: 'Schedule meeting with lecturer',
          });
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  },

  // Calculate required classes for minimum attendance
  async calculateRequiredClasses(studentId, courseId, minimumAttendance = 75) {
    try {
      const [courseData] = await db.execute(
        `SELECT 
          COUNT(DISTINCT cs.id) as total_sessions,
          COUNT(CASE WHEN al.verification_status IN ('success', 'late') THEN 1 END) as attended
        FROM class_sessions cs
        LEFT JOIN attendance_logs al ON cs.id = al.session_id AND al.student_id = ?
        WHERE cs.class_id = ?`,
        [studentId, courseId]
      );

      const data = courseData[0];
      const totalSessions = data.total_sessions || 0;
      const currentAttended = data.attended || 0;

      // Calculate remaining sessions needed
      let requiredClasses = 0;
      let achievableAttendance = currentAttended;

      for (let i = 0; i < totalSessions; i++) {
        const projectedPercent = (achievableAttendance / (totalSessions + i + 1)) * 100;
        if (projectedPercent >= minimumAttendance) {
          requiredClasses = i;
          break;
        }
        achievableAttendance++;
      }

      const currentAttendancePercent = totalSessions > 0 ? (currentAttended / totalSessions) * 100 : 0;

      return {
        currentAttendance: currentAttendancePercent.toFixed(2),
        currentAttendedClasses: currentAttended,
        totalClassesSoFar: totalSessions,
        minimumAttendanceRequired: minimumAttendance,
        classesNeededToReachMinimum: Math.max(0, requiredClasses),
        canReachMinimum: currentAttendancePercent >= minimumAttendance ? true : Math.max(0, requiredClasses) < 30,
      };
    } catch (error) {
      logger.error('Error calculating required classes:', error);
      throw error;
    }
  },

  // Get AI prediction for student
  async getAIPrediction(studentId, predictionType) {
    try {
      const [predictions] = await db.execute(
        `SELECT prediction_value, prediction_date
         FROM ai_predictions
         WHERE student_id = ? AND prediction_type = ?
         ORDER BY prediction_date DESC
         LIMIT 1`,
        [studentId, predictionType]
      );

      if (!predictions.length) {
        return null;
      }

      return {
        type: predictionType,
        value: JSON.parse(predictions[0].prediction_value),
        predictionDate: predictions[0].prediction_date,
      };
    } catch (error) {
      logger.error('Error fetching AI prediction:', error);
      throw error;
    }
  },

  // Get all predictions for student
  async getAllPredictions(studentId) {
    try {
      const [predictions] = await db.execute(
        `SELECT 
          prediction_type,
          prediction_value,
          prediction_date,
          ROW_NUMBER() OVER (PARTITION BY prediction_type ORDER BY prediction_date DESC) as rn
         FROM ai_predictions
         WHERE student_id = ?`,
        [studentId]
      );

      // Keep only latest prediction per type
      const latest = {};
      predictions.forEach(p => {
        if (!latest[p.prediction_type]) {
          latest[p.prediction_type] = {
            type: p.prediction_type,
            value: JSON.parse(p.prediction_value),
            date: p.prediction_date,
          };
        }
      });

      return Object.values(latest);
    } catch (error) {
      logger.error('Error fetching all predictions:', error);
      throw error;
    }
  },

  // Generate performance report
  async generatePerformanceReport(studentId) {
    try {
      // Get overall stats
      const [overallStats] = await db.execute(
        `SELECT 
          (SELECT ROUND(AVG(attendance_percent), 2) FROM student_attendance_analytics WHERE student_id = ?) as avg_attendance,
          (SELECT COUNT(DISTINCT course_id) FROM student_attendance_analytics WHERE student_id = ? AND attendance_percent >= 80) as good_courses,
          (SELECT COUNT(DISTINCT course_id) FROM student_attendance_analytics WHERE student_id = ? AND attendance_percent < 75) as at_risk_courses
        FROM dual`,
        [studentId, studentId, studentId]
      );

      const stats = overallStats[0];

      // Get trend
      const [trend] = await db.execute(
        `SELECT 
          DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01') as date,
          ROUND(AVG(CASE WHEN DATE(al.checkin_time) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
                         AND DATE(al.checkin_time) < CURDATE()
                    THEN CASE WHEN al.verification_status IN ('success', 'late') THEN 1 ELSE 0 END
                END) * 100, 2) as last_month_attendance,
          ROUND(AVG(CASE WHEN DATE(al.checkin_time) >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                         AND DATE(al.checkin_time) < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                    THEN CASE WHEN al.verification_status IN ('success', 'late') THEN 1 ELSE 0 END
                END) * 100, 2) as prev_month_attendance
        FROM attendance_logs al
        WHERE al.student_id = ?`,
        [studentId]
      );

      const t = trend[0];
      const trendDirection = t.last_month_attendance > t.prev_month_attendance ? 'improving' : 'declining';

      return {
        averageAttendance: stats.avg_attendance || 0,
        goodCourses: stats.good_courses || 0,
        atRiskCourses: stats.at_risk_courses || 0,
        trendLastMonth: t.last_month_attendance || 0,
        trendPreviousMonth: t.prev_month_attendance || 0,
        trendDirection: trendDirection,
        summary: this.generateReportSummary(stats.avg_attendance, stats.at_risk_courses),
      };
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  },

  // Helper: Generate report summary
  generateReportSummary(avgAttendance, atRiskCourses) {
    let summary = '';

    if (avgAttendance >= 85) {
      summary = 'Excellent attendance record. Keep up the great work!';
    } else if (avgAttendance >= 75) {
      summary = 'Good attendance overall. Continue to maintain consistency.';
    } else {
      summary = 'Attendance needs improvement. Focus on attending more classes.';
    }

    if (atRiskCourses > 0) {
      summary += ` You have ${atRiskCourses} course(s) with low attendance.`;
    }

    return summary;
  },
};

module.exports = aiInsightsService;
