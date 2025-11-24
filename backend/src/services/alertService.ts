import { query } from '../config/database';
import { Alert, AlertType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { RealtimeService } from './realtimeService';

export class AlertService {
  /**
   * Create a new alert
   */
  static async createAlert(data: {
    type: AlertType;
    message: string;
    device_id?: string;
    session_id?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }): Promise<Alert> {
    const id = uuidv4();
    const sql = `
      INSERT INTO alerts (id, type, message, device_id, session_id, severity, timestamp, resolved)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), false)
      RETURNING *
    `;
    const rows = await query<Alert>(sql, [
      id,
      data.type,
      data.message,
      data.device_id || null,
      data.session_id || null,
      data.severity,
    ]);

    const alert = rows[0];

    // Broadcast alert to dashboard
    RealtimeService.broadcastAlert({
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      device_id: alert.device_id,
    });

    logger.warn('Alert created', {
      type: data.type,
      message: data.message,
      severity: data.severity,
    });

    return alert;
  }

  /**
   * Get unresolved alerts
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    const sql = `
      SELECT a.*, d.device_id as device_info
      FROM alerts a
      LEFT JOIN devices d ON a.device_id = d.id
      WHERE a.resolved = false
      ORDER BY a.timestamp DESC
      LIMIT 100
    `;
    return query(sql);
  }

  /**
   * Get alerts by date range
   */
  static async getAlertsByDateRange(startDate: Date, endDate: Date, resolved?: boolean): Promise<Alert[]> {
    let sql = `
      SELECT a.*, d.device_id as device_info
      FROM alerts a
      LEFT JOIN devices d ON a.device_id = d.id
      WHERE a.timestamp >= $1 AND a.timestamp <= $2
    `;
    const params: unknown[] = [startDate, endDate];

    if (resolved !== undefined) {
      sql += ' AND a.resolved = $3';
      params.push(resolved);
    }

    sql += ' ORDER BY a.timestamp DESC';
    return query(sql, params);
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<Alert | null> {
    const sql = `
      UPDATE alerts
      SET resolved = true
      WHERE id = $1
      RETURNING *
    `;
    const rows = await query<Alert>(sql, [alertId]);
    return rows[0] || null;
  }

  /**
   * Resolve all alerts
   */
  static async resolveAllAlerts(): Promise<number> {
    const sql = `
      UPDATE alerts
      SET resolved = true
      WHERE resolved = false
      RETURNING id
    `;
    const rows = await query<{ id: string }>(sql);
    return rows.length;
  }

  /**
   * Get alert counts by severity
   */
  static async getAlertCounts() {
    const sql = `
      SELECT severity, COUNT(*) as count
      FROM alerts
      WHERE resolved = false
      GROUP BY severity
    `;
    return query(sql);
  }
}
