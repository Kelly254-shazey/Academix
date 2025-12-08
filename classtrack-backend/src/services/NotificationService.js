/**
 * Notification Service
 * Manages push notifications, emails, and in-app alerts
 */

const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Send push notification via Web Push API
   */
  static async sendWebPush(userId, notification) {
    try {
      // In production, use Firebase Cloud Messaging or Web Push Service
      const webPushPayload = {
        title: notification.title,
        body: notification.body,
        icon: '/icons/notification-icon.png',
        badge: '/icons/notification-badge.png',
        data: notification.data || {},
      };

      // TODO: Send via Firebase FCM or Web Push API
      console.log('Web push notification:', webPushPayload);

      return {
        success: true,
        message: 'Push notification sent',
      };
    } catch (err) {
      console.error('Send web push error:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(toEmail, subject, htmlContent) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@classtrack-ai.com',
        to: toEmail,
        subject,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err) {
      console.error('Send email error:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Class cancellation notification template
   */
  static getClassCancellationEmail(studentName, courseName, reason) {
    return `
      <h2>Class Cancellation Notice</h2>
      <p>Hi ${studentName},</p>
      <p>We regret to inform you that <strong>${courseName}</strong> has been cancelled.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please check the platform for any rescheduling updates.</p>
      <p>Best regards,<br>ClassTrack AI Team</p>
    `;
  }

  /**
   * Attendance summary email template
   */
  static getAttendanceSummaryEmail(studentName, attendanceData) {
    return `
      <h2>Your Attendance Summary</h2>
      <p>Hi ${studentName},</p>
      <p>Here's your attendance overview:</p>
      <ul>
        <li><strong>Classes Attended:</strong> ${attendanceData.attended}</li>
        <li><strong>Total Sessions:</strong> ${attendanceData.total}</li>
        <li><strong>Attendance Rate:</strong> ${attendanceData.percentage}%</li>
      </ul>
      <p>Keep up the great work!</p>
      <p>Best regards,<br>ClassTrack AI Team</p>
    `;
  }
}

module.exports = NotificationService;
