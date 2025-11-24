import { query } from '../config/database';
import { ErrorLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ErrorLogModel {
  static async create(data: {
    device_id: string;
    session_id?: string;
    error_type: string;
    error_message: string;
    stack_trace?: string;
  }): Promise<ErrorLog> {
    const id = uuidv4();
    const sql = `
      INSERT INTO error_logs (id, device_id, session_id, error_type, error_message, stack_trace, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    const rows = await query<ErrorLog>(sql, [
      id,
      data.device_id,
      data.session_id || null,
      data.error_type,
      data.error_message,
      data.stack_trace || null,
    ]);
    return rows[0];
  }

  static async findById(id: string): Promise<ErrorLog | null> {
    const sql = 'SELECT * FROM error_logs WHERE id = $1';
    const rows = await query<ErrorLog>(sql, [id]);
    return rows[0] || null;
  }

  static async findByDeviceId(deviceId: string, limit = 100): Promise<ErrorLog[]> {
    const sql = 'SELECT * FROM error_logs WHERE device_id = $1 ORDER BY timestamp DESC LIMIT $2';
    return query<ErrorLog>(sql, [deviceId, limit]);
  }

  static async getRecentErrors(limit = 50): Promise<ErrorLog[]> {
    const sql = `
      SELECT el.*, d.device_id as device_info
      FROM error_logs el
      JOIN devices d ON el.device_id = d.id
      ORDER BY el.timestamp DESC
      LIMIT $1
    `;
    return query(sql, [limit]);
  }

  static async getErrorCountByType(startDate: Date, endDate: Date) {
    const sql = `
      SELECT error_type, COUNT(*) as count
      FROM error_logs
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY error_type
      ORDER BY count DESC
    `;
    return query(sql, [startDate, endDate]);
  }

  static async getErrorRate(hours = 24) {
    const sql = `
      SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as error_count
      FROM error_logs
      WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour
    `;
    return query(sql);
  }
}
