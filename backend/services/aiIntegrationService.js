// aiIntegrationService.js
// AI/ML integration: trigger training jobs, get predictions, manage models
// Author: Backend Team
// Date: December 11, 2025

const db = require('../database');
const logger = require('../utils/logger');

class AIIntegrationService {
  /**
   * Create AI training job
   */
  async createTrainingJob(modelName, jobType, inputParams, createdBy) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const jobId = `ai_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [result] = await db.execute(`
        INSERT INTO ai_jobs (
          job_id, job_type, model_name, status,
          input_params, created_by
        ) VALUES (?, ?, ?, 'pending', ?, ?)
      `, [
        jobId,
        jobType,
        modelName,
        JSON.stringify(inputParams),
        createdBy,
      ]);

      logger.info(`AI training job ${jobId} created for model ${modelName}`);

      return {
        success: true,
        data: {
          jobId,
          modelName,
          jobType,
          status: 'pending',
        },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in createTrainingJob:', error);
      throw error;
    }
  }

  /**
   * Get prediction (call to microservice)
   */
  async getPrediction(modelName, inputData) {
    try {

      const jobId = `ai_pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Log prediction request
      const [result] = await db.execute(`
        INSERT INTO ai_jobs (
          job_id, job_type, model_name, status,
          input_params
        ) VALUES (?, 'prediction', ?, 'running', ?)
      `, [jobId, modelName, JSON.stringify(inputData)]);

      // ML microservice is not configured in this environment.
      // Avoid returning fabricated predictions — surface explicit not-implemented response.
      return {
        success: false,
        message: 'Prediction service not configured. Configure ML microservice to enable predictions.'
      };
    } catch (error) {
      logger.error('Error in getPrediction:', error);
      throw error;
    }
  }

  /**
   * Get AI job status
   */
  async getJobStatus(jobId) {
    try {

      const [job] = await db.execute(`
        SELECT 
          id, job_id, job_type, model_name, status,
          progress_percent, input_params, output_results, metrics,
          created_at, started_at, completed_at, estimated_completion,
          error_message, retry_count
        FROM ai_jobs
        WHERE job_id = ?
      `, [jobId]);

      if (!job || job.length === 0) {
        throw new Error('AI job not found');
      }

      return {
        success: true,
        data: job[0],
      };
    } catch (error) {
      logger.error('Error in getJobStatus:', error);
      throw error;
    }
  }

  /**
   * List AI jobs with filters
   */
  async listAIJobs(filters = {}, limit = 50, offset = 0) {
    try {

      let query = `
        SELECT 
          id, job_id, job_type, model_name, status,
          progress_percent, created_at, completed_at
        FROM ai_jobs
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.jobType) {
        query += ` AND job_type = ?`;
        params.push(filters.jobType);
      }

      if (filters.modelName) {
        query += ` AND model_name = ?`;
        params.push(filters.modelName);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [jobs] = await db.execute(query, params);

      return {
        success: true,
        data: jobs || [],
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error in listAIJobs:', error);
      throw error;
    }
  }

  /**
   * Cancel AI job
   */
  async cancelJob(jobId) {
    let conn;
    try {
      conn = await mysql.createPool({
        connectionLimit: 10,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      const [result] = await db.execute(`
        UPDATE ai_jobs SET status = 'cancelled'
        WHERE job_id = ? AND status IN ('pending', 'running')
      `, [jobId]);

      return {
        success: result.affectedRows > 0,
        data: { jobId, cancelled: result.affectedRows > 0 },
      };
    } catch (error) {
      if (conn)
      logger.error('Error in cancelJob:', error);
      throw error;
    }
  }

  /**
   * Get model metrics
   */
  async getModelMetrics(modelName) {
    try {

      const [jobs] = await db.execute(`
        SELECT 
          model_name,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          AVG(progress_percent) as avg_progress,
          COUNT(CASE WHEN metrics IS NOT NULL THEN 1 END) as evaluated_jobs
        FROM ai_jobs
        WHERE model_name = ? AND status IN ('completed', 'failed')
        GROUP BY model_name
      `, [modelName]);

      if (!jobs || jobs.length === 0) {
        return {
          success: false,
          message: 'No metrics found for this model',
        };
      }

      return {
        success: true,
        data: jobs[0],
        modelName,
      };
    } catch (error) {
      logger.error('Error in getModelMetrics:', error);
      throw error;
    }
  }

  /**
   * Trigger attendance prediction
   */
  async predictStudentAttendance(studentId, daysAhead = 7) {
    try {

      // Get student's attendance history
      const [history] = await db.execute(`
        SELECT 
          DATE(s.session_date) as session_date,
          al.status as attendance_status
        FROM attendance_logs al
        INNER JOIN sessions s ON al.session_id = s.id
        WHERE al.student_id = ?
        ORDER BY s.session_date DESC
        LIMIT 30
      `, [studentId]);

      // Create prediction job
      const jobId = `attendance_pred_${studentId}_${Date.now()}`;
      const inputParams = {
        studentId,
        historyDays: 30,
        predictionDays: daysAhead,
        records: history,
      };

      // ML microservice not configured — do not return mock results.
      return {
        success: false,
        message: 'Attendance prediction service not configured in this environment.'
      };
    } catch (error) {
      logger.error('Error in predictStudentAttendance:', error);
      throw error;
    }
  }

  /**
   * Trigger anomaly detection
   */
  async detectAnomalies(dataType = 'attendance') {
    try {

      const jobId = `anomaly_${dataType}_${Date.now()}`;

      const [result] = await db.execute(`
        INSERT INTO ai_jobs (
          job_id, job_type, model_name, status,
          input_params
        ) VALUES (?, 'evaluation', ?, 'pending', ?)
      `, [
        jobId,
        `anomaly_detection_${dataType}`,
        JSON.stringify({ dataType }),
      ]);

      return {
        success: true,
        data: {
          jobId,
          dataType,
          status: 'pending',
        },
      };
    } catch (error) {
      logger.error('Error in detectAnomalies:', error);
      throw error;
    }
  }
}

module.exports = new AIIntegrationService();
