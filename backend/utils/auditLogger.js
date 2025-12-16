const db = require('../../backend/database');

class AuditLogger {
  static async log(userId, action, resource, resourceId, description, metadata = null, severity = 'info', req = null) {
    try {
      const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
      const userAgent = req ? req.get('User-Agent') : null;

      await db.execute(`
        INSERT INTO audit_logs (user_id, action, resource, resource_id, description, ip_address, user_agent, metadata, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, action, resource, resourceId, description, ipAddress, userAgent, JSON.stringify(metadata), severity]);

      console.log(`[AUDIT] ${action} by user ${userId}: ${description}`);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  // Convenience methods for common actions
  static async logLogin(userId, req) {
    await this.log(userId, 'LOGIN', 'user', userId, `User logged in`, null, 'info', req);
  }

  static async logLogout(userId, req) {
    await this.log(userId, 'LOGOUT', 'user', userId, `User logged out`, null, 'info', req);
  }

  static async logCreate(userId, resource, resourceId, description, req) {
    await this.log(userId, 'CREATE', resource, resourceId, description, null, 'info', req);
  }

  static async logUpdate(userId, resource, resourceId, description, changes = null, req) {
    await this.log(userId, 'UPDATE', resource, resourceId, description, changes, 'info', req);
  }

  static async logDelete(userId, resource, resourceId, description, req) {
    await this.log(userId, 'DELETE', resource, resourceId, description, null, 'warning', req);
  }

  static async logError(userId, action, description, error, req) {
    await this.log(userId, action, 'system', null, description, { error: error.message }, 'error', req);
  }

  static async logSecurity(userId, action, description, metadata, req) {
    await this.log(userId, action, 'security', null, description, metadata, 'warning', req);
  }
}

module.exports = AuditLogger;