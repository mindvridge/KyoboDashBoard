import { query } from '../config/database';
import { ContentLog, ContentActionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ContentLogModel {
  static async create(data: {
    session_id: string;
    content_id: string;
    content_name: string;
    action_type: ContentActionType;
    duration?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ContentLog> {
    const id = uuidv4();
    const sql = `
      INSERT INTO content_logs (id, session_id, content_id, content_name, action_type, timestamp, duration, metadata)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING *
    `;
    const rows = await query<ContentLog>(sql, [
      id,
      data.session_id,
      data.content_id,
      data.content_name,
      data.action_type,
      data.duration || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
    return rows[0];
  }

  static async findById(id: string): Promise<ContentLog | null> {
    const sql = 'SELECT * FROM content_logs WHERE id = $1';
    const rows = await query<ContentLog>(sql, [id]);
    return rows[0] || null;
  }

  static async findBySessionId(sessionId: string): Promise<ContentLog[]> {
    const sql = 'SELECT * FROM content_logs WHERE session_id = $1 ORDER BY timestamp';
    return query<ContentLog>(sql, [sessionId]);
  }

  static async getRecentLogs(limit = 50): Promise<ContentLog[]> {
    const sql = `
      SELECT cl.*, s.device_id, d.device_id as device_info
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      JOIN devices d ON s.device_id = d.id
      ORDER BY cl.timestamp DESC
      LIMIT $1
    `;
    return query(sql, [limit]);
  }

  static async getPopularContents(startDate: Date, endDate: Date, limit = 10) {
    const sql = `
      SELECT
        content_id,
        content_name,
        COUNT(*) as view_count,
        SUM(CASE WHEN action_type = 'WATCH_END' THEN duration ELSE 0 END) as total_watch_time,
        AVG(CASE WHEN action_type = 'WATCH_END' THEN duration END) as avg_watch_time
      FROM content_logs
      WHERE timestamp >= $1 AND timestamp <= $2
        AND action_type IN ('SELECT', 'WATCH_END')
      GROUP BY content_id, content_name
      ORDER BY view_count DESC
      LIMIT $3
    `;
    return query(sql, [startDate, endDate, limit]);
  }

  static async getTotalWatchTimeToday(): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(duration), 0) as total
      FROM content_logs
      WHERE DATE(timestamp) = CURRENT_DATE
        AND action_type = 'WATCH_END'
    `;
    const rows = await query<{ total: string }>(sql);
    return parseInt(rows[0]?.total || '0', 10);
  }

  static async getContentStats(contentId: string, startDate: Date, endDate: Date) {
    const sql = `
      SELECT
        COUNT(CASE WHEN action_type = 'SELECT' THEN 1 END) as select_count,
        COUNT(CASE WHEN action_type = 'WATCH_START' THEN 1 END) as watch_start_count,
        COUNT(CASE WHEN action_type = 'WATCH_END' THEN 1 END) as watch_complete_count,
        SUM(CASE WHEN action_type = 'WATCH_END' THEN duration ELSE 0 END) as total_watch_time,
        AVG(CASE WHEN action_type = 'WATCH_END' THEN duration END) as avg_watch_time
      FROM content_logs
      WHERE content_id = $1 AND timestamp >= $2 AND timestamp <= $3
    `;
    const rows = await query(sql, [contentId, startDate, endDate]);
    return rows[0];
  }

  static async getDailyStats(startDate: Date, endDate: Date) {
    const sql = `
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(CASE WHEN action_type = 'SELECT' THEN 1 END) as selections,
        SUM(CASE WHEN action_type = 'WATCH_END' THEN duration ELSE 0 END) as total_watch_time
      FROM content_logs
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
    return query(sql, [startDate, endDate]);
  }

  static async getHourlyDistribution(date: Date) {
    const sql = `
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as event_count,
        COUNT(CASE WHEN action_type = 'SELECT' THEN 1 END) as selections
      FROM content_logs
      WHERE DATE(timestamp) = DATE($1)
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY hour
    `;
    return query(sql, [date]);
  }

  static async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      spaceId?: string;
      deviceId?: string;
      contentId?: string;
      actionType?: ContentActionType;
      limit?: number;
      offset?: number;
    }
  ) {
    let sql = `
      SELECT cl.*, s.id as session_id, d.device_id as device_info, sp.name as space_name
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      JOIN devices d ON s.device_id = d.id
      LEFT JOIN spaces sp ON d.space_id = sp.id
      WHERE cl.timestamp >= $1 AND cl.timestamp <= $2
    `;
    const params: unknown[] = [startDate, endDate];
    let paramIndex = 3;

    if (options?.spaceId) {
      sql += ` AND d.space_id = $${paramIndex++}`;
      params.push(options.spaceId);
    }
    if (options?.deviceId) {
      sql += ` AND d.id = $${paramIndex++}`;
      params.push(options.deviceId);
    }
    if (options?.contentId) {
      sql += ` AND cl.content_id = $${paramIndex++}`;
      params.push(options.contentId);
    }
    if (options?.actionType) {
      sql += ` AND cl.action_type = $${paramIndex++}`;
      params.push(options.actionType);
    }

    sql += ' ORDER BY cl.timestamp DESC';

    if (options?.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    return query(sql, params);
  }
}
