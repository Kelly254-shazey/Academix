/**
 * AI Risk Scoring Module
 * Analyzes behavior patterns and generates fraud risk scores
 * Detects: proxy attendance, device reuse, location anomalies, late scans
 */

const db = require('../database');
const logger = require('../utils/logger');

class AIRiskScoringService {
  /**
   * Comprehensive risk assessment for a student's attendance
   */
  async analyzeStudentRisk(studentId, classSessionId, scanContext) {
    try {
      const riskFactors = {};
      let totalRiskScore = 0;

      // 1. Device Behavior Analysis
      riskFactors.deviceRisk = await this._analyzeDeviceBehavior(studentId, scanContext.deviceHash);
      totalRiskScore += riskFactors.deviceRisk.score * 0.2; // 20% weight

      // 2. Location Pattern Analysis
      riskFactors.locationRisk = await this._analyzeLocationPattern(
        studentId,
        scanContext.latitude,
        scanContext.longitude
      );
      totalRiskScore += riskFactors.locationRisk.score * 0.25; // 25% weight

      // 3. Network Behavior Analysis
      riskFactors.networkRisk = await this._analyzeNetworkBehavior(studentId, scanContext.ipAddress);
      totalRiskScore += riskFactors.networkRisk.score * 0.15; // 15% weight

      // 4. Temporal Pattern Analysis
      riskFactors.temporalRisk = await this._analyzeTemporalPatterns(studentId, classSessionId);
      totalRiskScore += riskFactors.temporalRisk.score * 0.2; // 20% weight

      // 5. Behavioral Anomalies
      riskFactors.anomalyRisk = await this._detectAnomalies(studentId);
      totalRiskScore += riskFactors.anomalyRisk.score * 0.2; // 20% weight

      const finalScore = Math.min(Math.round(totalRiskScore), 100);
      const riskLevel = this._getRiskLevel(finalScore);
      const recommendations = this._getRecommendations(riskFactors);

      logger.info(`Risk analysis complete for student ${studentId}`, {
        riskScore: finalScore,
        riskLevel,
        factors: riskFactors
      });

      return {
        riskScore: finalScore,
        riskLevel,
        factors: riskFactors,
        recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error in risk scoring:', error);
      return {
        riskScore: 0,
        riskLevel: 'unknown',
        factors: {},
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze device usage patterns (reuse, frequency, variety)
   */
  async _analyzeDeviceBehavior(studentId, currentDeviceHash) {
    try {
      const [deviceStats] = await db.execute(
        `SELECT 
          COUNT(DISTINCT device_hash) as unique_devices,
          device_hash,
          COUNT(*) as usage_count
         FROM attendance_scans
         WHERE student_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY device_hash
         ORDER BY usage_count DESC
         LIMIT 5`,
        [studentId]
      );

      let score = 0;
      let flags = [];

      if (deviceStats && deviceStats.length > 0) {
        // Check for excessive device variety (possible proxy)
        if (deviceStats.length > 5) {
          score += 25;
          flags.push('excessive_device_variety');
        }

        // Check for single device dominance (normal)
        const mostUsedDevice = deviceStats[0];
        if (mostUsedDevice.usage_count >= 20) {
          score -= 15; // Reduce risk for consistent device usage
        }

        // Check if current device matches recent pattern
        const recentDevices = deviceStats.map(d => d.device_hash);
        if (!recentDevices.includes(currentDeviceHash)) {
          score += 20;
          flags.push('unusual_device');
        }
      }

      return {
        score: Math.max(0, score),
        details: { unique_devices: deviceStats?.length || 0, flags },
        severity: score > 30 ? 'high' : score > 15 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error analyzing device behavior:', error);
      return { score: 0, details: {}, severity: 'unknown' };
    }
  }

  /**
   * Analyze location patterns (consistency, distance from typical location)
   */
  async _analyzeLocationPattern(studentId, currentLat, currentLon) {
    try {
      const [locationHistory] = await db.execute(
        `SELECT latitude, longitude, COUNT(*) as frequency
         FROM attendance_scans
         WHERE student_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND created_at > DATE_SUB(NOW(), INTERVAL 60 DAY)
         GROUP BY ROUND(latitude, 4), ROUND(longitude, 4)
         ORDER BY frequency DESC`,
        [studentId]
      );

      let score = 0;
      let flags = [];

      if (locationHistory && locationHistory.length > 0) {
        const usualLocation = locationHistory[0];
        const distance = this._calculateDistance(
          usualLocation.latitude,
          usualLocation.longitude,
          currentLat,
          currentLon
        );

        // Distance thresholds (in meters)
        if (distance > 1000) {
          score += 40;
          flags.push('significant_location_change');
        } else if (distance > 500) {
          score += 20;
          flags.push('unusual_location');
        } else if (distance > 100) {
          score += 5;
        }

        // Location consistency score
        const consistencyRatio = usualLocation.frequency / (locationHistory.length || 1);
        if (consistencyRatio < 0.5) {
          score += 15;
          flags.push('inconsistent_location');
        } else if (consistencyRatio > 0.8) {
          score -= 10;
        }
      }

      return {
        score: Math.max(0, score),
        details: { locations_count: locationHistory?.length || 0, flags },
        severity: score > 30 ? 'high' : score > 15 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error analyzing location pattern:', error);
      return { score: 0, details: {}, severity: 'unknown' };
    }
  }

  /**
   * Analyze network behavior (IP changes, geo-IP correlation)
   */
  async _analyzeNetworkBehavior(studentId, currentIP) {
    try {
      const [ipHistory] = await db.execute(
        `SELECT ip_address, COUNT(*) as frequency
         FROM attendance_scans
         WHERE student_id = ? AND ip_address IS NOT NULL
         AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY ip_address
         ORDER BY frequency DESC`,
        [studentId]
      );

      let score = 0;
      let flags = [];

      if (ipHistory && ipHistory.length > 0) {
        // Check for excessive IP variety (VPN/Proxy indicator)
        if (ipHistory.length > 10) {
          score += 30;
          flags.push('vpn_proxy_suspected');
        } else if (ipHistory.length > 5) {
          score += 15;
          flags.push('frequent_ip_changes');
        }

        // Check if current IP is in recent history
        const recentIPs = ipHistory.map(h => h.ip_address);
        if (!recentIPs.includes(currentIP)) {
          score += 10;
          flags.push('new_ip_address');
        }

        // Check for dominant IP (consistent network)
        const mostUsedIP = ipHistory[0];
        if (mostUsedIP.frequency >= 15) {
          score -= 8; // Reduce risk for consistent IP usage
        }
      }

      return {
        score: Math.max(0, score),
        details: { unique_ips: ipHistory?.length || 0, flags },
        severity: score > 25 ? 'high' : score > 10 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error analyzing network behavior:', error);
      return { score: 0, details: {}, severity: 'unknown' };
    }
  }

  /**
   * Analyze temporal patterns (attendance timing, gaps, clusters)
   */
  async _analyzeTemporalPatterns(studentId, classSessionId) {
    try {
      // Get current session details
      const [sessionInfo] = await db.execute(
        `SELECT cs.start_time, cs.end_time, c.day_of_week
         FROM class_sessions cs
         JOIN classes c ON cs.class_id = c.id
         WHERE cs.id = ?`,
        [classSessionId]
      );

      if (!sessionInfo || sessionInfo.length === 0) {
        return { score: 0, details: {}, severity: 'unknown' };
      }

      const currentSession = sessionInfo[0];
      const scanTime = new Date();
      const startTime = new Date(currentSession.start_time);
      const minutesLate = (scanTime - startTime) / (1000 * 60);

      let score = 0;
      let flags = [];

      // Analyze late arrivals
      if (minutesLate > 15) {
        score += 20;
        flags.push('late_scan');
      } else if (minutesLate > 5) {
        score += 10;
        flags.push('slightly_late');
      } else if (minutesLate < -5) {
        score += 5;
        flags.push('early_scan');
      }

      // Analyze attendance frequency for this class
      const [classAttendance] = await db.execute(
        `SELECT COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as attended
         FROM attendance_scans
         WHERE student_id = ? AND class_session_id IN (
           SELECT id FROM class_sessions WHERE class_id = (
             SELECT class_id FROM class_sessions WHERE id = ?
           ) AND created_at > DATE_SUB(NOW(), INTERVAL 60 DAY)
         )`,
        [studentId, classSessionId]
      );

      if (classAttendance && classAttendance[0]) {
        const attendanceRate = classAttendance[0].attended / classAttendance[0].total_sessions;
        if (attendanceRate < 0.5) {
          score += 15;
          flags.push('low_attendance_rate');
        } else if (attendanceRate > 0.9) {
          score -= 10; // Reduce risk for consistent attendance
        }
      }

      return {
        score: Math.max(0, score),
        details: { minutes_late: minutesLate, flags },
        severity: score > 20 ? 'high' : score > 10 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error analyzing temporal patterns:', error);
      return { score: 0, details: {}, severity: 'unknown' };
    }
  }

  /**
   * Detect behavioral anomalies using statistical analysis
   */
  async _detectAnomalies(studentId) {
    try {
      const [recentScans] = await db.execute(
        `SELECT * FROM attendance_scans
         WHERE student_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY created_at DESC
         LIMIT 20`,
        [studentId]
      );

      let score = 0;
      let flags = [];

      if (recentScans && recentScans.length > 0) {
        // Check for rapid succession scans (impossible to move between locations)
        const scans = recentScans.map(s => ({
          time: new Date(s.created_at),
          lat: s.latitude,
          lon: s.longitude
        }));

        for (let i = 0; i < scans.length - 1; i++) {
          const timeDiff = (scans[i].time - scans[i + 1].time) / 1000 / 60; // minutes
          const distance = this._calculateDistance(
            scans[i].lat,
            scans[i].lon,
            scans[i + 1].lat,
            scans[i + 1].lon
          );

          // If moved >500m in <5 minutes, flag as impossible
          if (distance > 500 && timeDiff < 5) {
            score += 35;
            flags.push('impossible_movement');
            break;
          }
        }

        // Check for flagged scans in recent history
        const flaggedCount = recentScans.filter(s => s.risk_score > 60).length;
        if (flaggedCount > 3) {
          score += 25;
          flags.push('repeated_high_risk_scans');
        }
      }

      return {
        score: Math.max(0, score),
        details: { flags, recent_scan_count: recentScans?.length || 0 },
        severity: score > 20 ? 'high' : score > 10 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return { score: 0, details: {}, severity: 'unknown' };
    }
  }

  /**
   * Get risk level based on score
   */
  _getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  /**
   * Generate recommendations based on risk factors
   */
  _getRecommendations(factors) {
    const recommendations = [];

    if (factors.deviceRisk?.score > 20) {
      recommendations.push('Review device change history');
    }
    if (factors.locationRisk?.score > 25) {
      recommendations.push('Verify location consistency');
    }
    if (factors.networkRisk?.score > 20) {
      recommendations.push('Check for VPN/Proxy usage');
    }
    if (factors.temporalRisk?.score > 15) {
      recommendations.push('Monitor attendance timing patterns');
    }
    if (factors.anomalyRisk?.score > 20) {
      recommendations.push('Investigate suspicious activity');
    }

    return recommendations;
  }

  /**
   * Calculate Haversine distance (meters)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate AI insights for lecturer dashboard
   */
  async generateLecturerInsights(lecturerId, classId) {
    try {
      const [riskySessions] = await db.execute(
        `SELECT cs.id, cs.start_time,
                COUNT(DISTINCT CASE WHEN ash.risk_score > 60 THEN ash.student_id END) as flagged_students,
                COUNT(DISTINCT ash.student_id) as total_attendees,
                AVG(ash.risk_score) as avg_risk_score
         FROM class_sessions cs
         LEFT JOIN attendance_scans ash ON cs.id = ash.class_session_id
         WHERE cs.class_id = ? AND cs.lecturer_id = ?
         AND cs.start_time > DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY cs.id
         ORDER BY avg_risk_score DESC
         LIMIT 10`,
        [classId, lecturerId]
      );

      const [patternAnalysis] = await db.execute(
        `SELECT 
          COUNT(DISTINCT student_id) as unique_students,
          SUM(CASE WHEN risk_score > 60 THEN 1 ELSE 0 END) as suspicious_attendances,
          AVG(risk_score) as avg_risk_across_class,
          MAX(risk_score) as max_risk_score
         FROM attendance_scans
         WHERE class_session_id IN (
           SELECT id FROM class_sessions WHERE class_id = ? AND lecturer_id = ?
         )`,
        [classId, lecturerId]
      );

      return {
        riskySessions: riskySessions || [],
        classPatternAnalysis: patternAnalysis?.[0] || {},
        recommendations: this._generateLecturerRecommendations(
          patternAnalysis?.[0] || {}
        )
      };
    } catch (error) {
      logger.error('Error generating lecturer insights:', error);
      return { riskySessions: [], classPatternAnalysis: {}, recommendations: [] };
    }
  }

  /**
   * Generate recommendations for lecturer
   */
  _generateLecturerRecommendations(analysis) {
    const recommendations = [];

    if (analysis.suspicious_attendances > 5) {
      recommendations.push({
        priority: 'high',
        message: `${analysis.suspicious_attendances} suspicious attendance records detected. Review flagged sessions.`
      });
    }

    if (analysis.avg_risk_across_class > 40) {
      recommendations.push({
        priority: 'medium',
        message: 'Overall class risk score is elevated. Consider implementing stricter verification.'
      });
    }

    if (analysis.unique_students < 20) {
      recommendations.push({
        priority: 'low',
        message: 'Consider improving class engagement and attendance incentives.'
      });
    }

    return recommendations;
  }
}

module.exports = new AIRiskScoringService();
