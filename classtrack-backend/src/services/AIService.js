/**
 * AI/ML Engine Service
 * Handles predictions, anomaly detection, and trend analysis
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AIService {
  /**
   * Predict student absenteeism risk
   * Based on: past attendance, time of day, day of week, course patterns
   */
  static async predictAbsenteeismRisk(studentId, courseId) {
    try {
      // Fetch historical attendance data
      const attendanceData = await db.query(
        `SELECT 
           COUNT(*) as total_classes,
           COUNT(CASE WHEN verification_status = 'success' THEN 1 END) as attended,
           EXTRACT(HOUR FROM LEAST(TIME(start_time))) as preferred_hours
         FROM attendance_logs al
         JOIN class_sessions cs ON al.session_id = cs.id
         JOIN classes c ON cs.class_id = c.id
         WHERE al.student_id = $1 AND c.id = $2`,
        [studentId, courseId],
      );

      const data = attendanceData.rows[0];
      
      // Simple linear model for MVP (replace with ML model in production)
      const attendanceRate = (data.attended / data.total_classes) * 100;
      const riskScore = Math.max(0, Math.min(100, 100 - attendanceRate));

      // Categorize risk level
      let riskLevel = 'low';
      if (riskScore >= 70) riskLevel = 'critical';
      else if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 30) riskLevel = 'medium';

      // Store prediction
      const predictionId = uuidv4();
      await db.query(
        `INSERT INTO ai_predictions 
         (id, student_id, course_id, prediction_type, prediction_value, risk_level, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [predictionId, studentId, courseId, 'absenteeism_risk', riskScore, riskLevel],
      );

      return {
        success: true,
        prediction: {
          type: 'absenteeism_risk',
          risk_score: riskScore,
          risk_level: riskLevel,
          attendance_rate: attendanceRate,
          recommendation:
            riskLevel === 'critical'
              ? 'Student needs immediate intervention'
              : `Student attendance at ${attendanceRate}%`,
        },
      };
    } catch (err) {
      console.error('Absenteeism prediction error:', err);
      throw err;
    }
  }

  /**
   * Detect anomalies in class attendance
   * Identifies unusual patterns (e.g., mass spoofing attempts)
   */
  static async detectAttendanceAnomalies(classId) {
    try {
      const result = await db.query(
        `SELECT 
           DATE_TRUNC('minute', created_at) as minute,
           COUNT(*) as check_ins,
           COUNT(CASE WHEN verification_status = 'spoofed' THEN 1 END) as spoofed_attempts,
           ROUND(COUNT(CASE WHEN verification_status = 'spoofed' THEN 1 END) * 100.0 / 
                 COUNT(*), 2) as spoof_percentage
         FROM attendance_logs al
         JOIN class_sessions cs ON al.session_id = cs.id
         WHERE cs.class_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY minute
         ORDER BY minute DESC`,
        [classId],
      );

      // Identify anomalies (>10% spoofed attempts)
      const anomalies = result.rows.filter((r) => r.spoof_percentage > 10);

      return {
        success: true,
        patterns: result.rows,
        anomalies: anomalies,
        severity: anomalies.length > 0 ? 'high' : 'normal',
      };
    } catch (err) {
      console.error('Anomaly detection error:', err);
      throw err;
    }
  }

  /**
   * Analyze attendance trends for a course
   */
  static async analyzeCourseTrends(courseId, daysBack = 30) {
    try {
      const result = await db.query(
        `SELECT 
           DATE(cs.session_date) as date,
           COUNT(DISTINCT al.id) as total_attended,
           COUNT(DISTINCT cs.id) as total_sessions,
           ROUND(COUNT(DISTINCT al.id) * 100.0 / COUNT(DISTINCT cs.id), 2) as attendance_rate,
           COUNT(CASE WHEN al.verification_status = 'success' THEN 1 END) as verified_present,
           COUNT(CASE WHEN al.verification_status = 'gps_fail' THEN 1 END) as gps_failures,
           COUNT(CASE WHEN al.verification_status = 'spoofed' THEN 1 END) as spoofed_attempts
         FROM class_sessions cs
         LEFT JOIN attendance_logs al ON cs.id = al.session_id
         JOIN classes c ON cs.class_id = c.id
         WHERE c.id = $1
         AND cs.session_date >= CURRENT_DATE - INTERVAL '${daysBack} days'
         GROUP BY date
         ORDER BY date DESC`,
        [courseId],
      );

      // Calculate trend (moving average)
      const trend = this.calculateTrend(result.rows);

      return {
        success: true,
        daily_data: result.rows,
        trend: trend,
        insights: this.generateTrendInsights(result.rows, trend),
      };
    } catch (err) {
      console.error('Trend analysis error:', err);
      throw err;
    }
  }

  /**
   * Calculate attendance trend (simple linear regression)
   */
  static calculateTrend(data) {
    if (data.length < 2) return 'stable';

    const rates = data.map((d) => d.attendance_rate);
    const firstHalf = rates.slice(0, Math.floor(rates.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(rates.length / 2);
    const secondHalf = rates.slice(Math.floor(rates.length / 2)).reduce((a, b) => a + b, 0) / (rates.length - Math.floor(rates.length / 2));

    if (secondHalf > firstHalf + 5) return 'improving';
    if (secondHalf < firstHalf - 5) return 'declining';
    return 'stable';
  }

  /**
   * Generate text insights from trend data
   */
  static generateTrendInsights(data, trend) {
    const avgRate = (data.reduce((sum, d) => sum + d.attendance_rate, 0) / data.length).toFixed(1);
    const totalSpoofed = data.reduce((sum, d) => sum + d.spoofed_attempts, 0);

    return {
      average_attendance: `${avgRate}%`,
      trend: `Attendance is ${trend}`,
      security_alerts: totalSpoofed > 5 ? `${totalSpoofed} spoofing attempts detected` : 'No major security issues',
      recommendation: trend === 'declining' ? 'Consider intervention measures' : 'Keep current strategies',
    };
  }

  /**
   * Generate lecturer performance insights
   */
  static async getLecturerInsights(lecturerId) {
    try {
      const result = await db.query(
        `SELECT 
           c.id,
           c.course_name,
           c.course_code,
           COUNT(DISTINCT cs.id) as total_sessions,
           COUNT(DISTINCT CASE WHEN cs.lecturer_checked_in THEN cs.id END) as punctual_sessions,
           AVG(COUNT(DISTINCT al.id)) as avg_attendance,
           ROUND(COUNT(DISTINCT CASE WHEN cs.lecturer_checked_in THEN cs.id END) * 100.0 / 
                 COUNT(DISTINCT cs.id), 2) as punctuality_rate
         FROM classes c
         LEFT JOIN class_sessions cs ON c.id = cs.class_id
         LEFT JOIN attendance_logs al ON cs.id = al.session_id
         WHERE c.lecturer_id = $1
         GROUP BY c.id`,
        [lecturerId],
      );

      return {
        success: true,
        courses: result.rows,
        overall_punctuality: this.calculateAveragePunctuality(result.rows),
      };
    } catch (err) {
      console.error('Lecturer insights error:', err);
      throw err;
    }
  }

  static calculateAveragePunctuality(courses) {
    if (courses.length === 0) return 0;
    return (courses.reduce((sum, c) => sum + c.punctuality_rate, 0) / courses.length).toFixed(1);
  }
}

module.exports = AIService;
