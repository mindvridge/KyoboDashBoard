import { query } from '../config/database';
import { Session } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SessionModel {
  static async create(deviceId: string): Promise<Session> {
    const id = uuidv4();
    const sql = `
      INSERT INTO sessions (id, device_id, start_time, is_active, created_at)
      VALUES ($1, $2, NOW(), true, NOW())
      RETURNING *
    `;
    const rows = await query<Session>(sql, [id, deviceId]);
    return rows[0];
  }

  static async findById(id: string): Promise<Session | null> {
    const sql = 'SELECT * FROM sessions WHERE id = $1';
    const rows = await query<Session>(sql, [id]);
    return rows[0] || null;
  }

  static async findActiveByDeviceId(deviceId: string): Promise<Session | null> {
    const sql = 'SELECT * FROM sessions WHERE device_id = $1 AND is_active = true ORDER BY start_time DESC LIMIT 1';
    const rows = await query<Session>(sql, [deviceId]);
    return rows[0] || null;
  }

  static async endSession(id: string, lobbyTime?: number): Promise<Session | null> {
    const sql = `
      UPDATE sessions
      SET
        end_time = NOW(),
        duration = EXTRACT(EPOCH FROM (NOW() - start_time))::integer,
        lobby_time = $2,
        is_active = false
      WHERE id = $1
      RETURNING *
    `;
    const rows = await query<Session>(sql, [id, lobbyTime || null]);
    return rows[0] || null;
  }

  static async getActiveSessions(): Promise<(Session & { device_info: string })[]> {
    const sql = `
      SELECT
        s.*,
        d.device_id as device_info,
        EXTRACT(EPOCH FROM (NOW() - s.start_time))::integer as current_duration
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      WHERE s.is_active = true
      ORDER BY s.start_time DESC
    `;
    return query(sql);
  }

  static async getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    _spaceId?: string,  // 더 이상 사용되지 않음
    deviceId?: string
  ): Promise<Session[]> {
    let sql = `
      SELECT s.*, d.device_id as device_info
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      WHERE s.start_time >= $1 AND s.start_time <= $2
    `;
    const params: unknown[] = [startDate, endDate];
    let paramIndex = 3;

    if (deviceId) {
      sql += ` AND d.id = $${paramIndex++}`;
      params.push(deviceId);
    }

    sql += ' ORDER BY s.start_time DESC';
    return query(sql, params);
  }

  static async getTodaySessionCount(): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE DATE(start_time) = CURRENT_DATE
    `;
    const rows = await query<{ count: string }>(sql);
    return parseInt(rows[0]?.count || '0', 10);
  }

  static async getActiveSessionCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM sessions WHERE is_active = true';
    const rows = await query<{ count: string }>(sql);
    return parseInt(rows[0]?.count || '0', 10);
  }

  static async getSessionStats(startDate: Date, endDate: Date) {
    const sql = `
      SELECT
        COUNT(*) as total_sessions,
        AVG(duration) as avg_duration,
        MAX(duration) as max_duration,
        MIN(duration) as min_duration,
        SUM(duration) as total_duration
      FROM sessions
      WHERE start_time >= $1 AND start_time <= $2 AND is_active = false
    `;
    const rows = await query(sql, [startDate, endDate]);
    return rows[0];
  }

  static async getHourlySessionDistribution(date: Date) {
    const sql = `
      SELECT
        EXTRACT(HOUR FROM start_time) as hour,
        COUNT(*) as session_count
      FROM sessions
      WHERE DATE(start_time) = DATE($1)
      GROUP BY EXTRACT(HOUR FROM start_time)
      ORDER BY hour
    `;
    return query(sql, [date]);
  }

  static async getSessionWithLogs(sessionId: string) {
    const sql = `
      SELECT
        s.*,
        d.device_id as device_info,
        json_agg(
          json_build_object(
            'id', cl.id,
            'content_id', cl.content_id,
            'content_name', cl.content_name,
            'action_type', cl.action_type,
            'timestamp', cl.timestamp,
            'duration', cl.duration
          ) ORDER BY cl.timestamp
        ) FILTER (WHERE cl.id IS NOT NULL) as logs
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      LEFT JOIN content_logs cl ON cl.session_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, d.device_id
    `;
    const rows = await query(sql, [sessionId]);
    return rows[0] || null;
  }
}
