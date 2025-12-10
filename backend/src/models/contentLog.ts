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

  /**
   * 특정 세션과 콘텐츠의 마지막 WATCH_START 이벤트를 찾습니다.
   * 같은 세션에서 못 찾으면 최근 1시간 내 모든 세션에서 검색합니다.
   */
  static async findLastWatchStart(sessionId: string, contentId: string): Promise<ContentLog | null> {
    // 1. 먼저 같은 세션에서 검색
    const sameSessionSql = `
      SELECT * FROM content_logs
      WHERE session_id = $1 AND content_id = $2 AND action_type = 'WATCH_START'
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const sameSessionRows = await query<ContentLog>(sameSessionSql, [sessionId, contentId]);
    if (sameSessionRows[0]) {
      return sameSessionRows[0];
    }

    // 2. 같은 세션에서 못 찾으면 최근 1시간 내 모든 세션에서 검색
    const recentSql = `
      SELECT * FROM content_logs
      WHERE content_id = $1 AND action_type = 'WATCH_START'
        AND timestamp >= NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const recentRows = await query<ContentLog>(recentSql, [contentId]);
    return recentRows[0] || null;
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
        COUNT(CASE WHEN action_type = 'WATCH_START' THEN 1 END) as view_count,
        SUM(CASE WHEN action_type = 'WATCH_END' THEN duration ELSE 0 END) as total_watch_time,
        AVG(CASE WHEN action_type = 'WATCH_END' THEN duration END) as avg_watch_time
      FROM content_logs
      WHERE timestamp >= $1 AND timestamp <= $2
        AND action_type IN ('WATCH_START', 'WATCH_END')
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

  /**
   * 특정 날짜의 콘텐츠별 시청 통계 (대시보드 캘린더용)
   * 개별 시청 기록 반환 (시간, 시청시간 포함)
   */
  static async getDailyContentStats(date: Date) {
    const sql = `
      SELECT
        cl.content_id,
        cl.content_name,
        cl.action_type,
        cl.timestamp,
        LEAST(cl.duration, 1200) as duration
      FROM content_logs cl
      WHERE DATE(cl.timestamp AT TIME ZONE 'Asia/Seoul') = DATE($1 AT TIME ZONE 'Asia/Seoul')
        AND cl.action_type IN ('WATCH_START', 'WATCH_END')
      ORDER BY cl.timestamp DESC
    `;
    return query(sql, [date]);
  }

  /**
   * 특정 날짜의 기기별 시청 상세 (대시보드 캘린더용)
   */
  static async getDailyDeviceViewings(date: Date) {
    const sql = `
      SELECT
        d.id as device_id,
        d.device_id as device_info,
        cl.content_id,
        cl.content_name,
        COUNT(CASE WHEN cl.action_type = 'SELECT' THEN 1 END) as view_count,
        COALESCE(SUM(CASE WHEN cl.action_type = 'WATCH_END' THEN LEAST(cl.duration, 1200) ELSE 0 END), 0) as total_watch_time,
        MIN(cl.timestamp) as first_view,
        MAX(cl.timestamp) as last_view
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      JOIN devices d ON s.device_id = d.id
      WHERE DATE(cl.timestamp AT TIME ZONE 'Asia/Seoul') = DATE($1 AT TIME ZONE 'Asia/Seoul')
      GROUP BY d.id, d.device_id, cl.content_id, cl.content_name
      ORDER BY d.device_id, total_watch_time DESC
    `;
    return query(sql, [date]);
  }

  /**
   * 월간 일별 시청 통계 요약 (캘린더 히트맵용)
   */
  static async getMonthlyDailySummary(year: number, month: number) {
    const sql = `
      SELECT
        DATE(cl.timestamp AT TIME ZONE 'Asia/Seoul') as date,
        COUNT(DISTINCT d.id) as device_count,
        COUNT(DISTINCT cl.content_id) as content_count,
        COALESCE(SUM(CASE WHEN cl.action_type = 'WATCH_END' THEN LEAST(cl.duration, 1200) ELSE 0 END), 0) as total_watch_time
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      JOIN devices d ON s.device_id = d.id
      WHERE EXTRACT(YEAR FROM cl.timestamp AT TIME ZONE 'Asia/Seoul') = $1
        AND EXTRACT(MONTH FROM cl.timestamp AT TIME ZONE 'Asia/Seoul') = $2
      GROUP BY DATE(cl.timestamp AT TIME ZONE 'Asia/Seoul')
      ORDER BY date
    `;
    return query(sql, [year, month]);
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
      spaceId?: string;  // 더 이상 사용되지 않음
      deviceId?: string;
      contentId?: string;
      actionType?: ContentActionType;
      limit?: number;
      offset?: number;
    }
  ) {
    let sql = `
      SELECT cl.*, s.id as session_id, d.device_id as device_info
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      JOIN devices d ON s.device_id = d.id
      WHERE cl.timestamp >= $1 AND cl.timestamp <= $2
    `;
    const params: unknown[] = [startDate, endDate];
    let paramIndex = 3;

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

  /**
   * 기기별 영상 시청 내역 조회
   */
  static async getWatchHistoryByDevice(deviceId: string, startDate?: Date, endDate?: Date) {
    let sql = `
      SELECT
        cl.content_id,
        cl.content_name,
        COUNT(*) as view_count,
        SUM(CASE WHEN cl.action_type = 'WATCH_END' THEN cl.duration ELSE 0 END) as total_watch_time,
        MAX(cl.timestamp) as last_watched,
        MIN(cl.timestamp) as first_watched
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      WHERE s.device_id = $1
        AND cl.action_type IN ('SELECT', 'WATCH_END')
    `;
    const params: unknown[] = [deviceId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND cl.timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND cl.timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += `
      GROUP BY cl.content_id, cl.content_name
      ORDER BY last_watched DESC
    `;

    return query(sql, params);
  }

  /**
   * 기기별 상세 시청 로그 조회
   */
  static async getDetailedWatchLogsByDevice(deviceId: string, startDate?: Date, endDate?: Date, limit = 100) {
    let sql = `
      SELECT
        cl.id,
        cl.content_id,
        cl.content_name,
        cl.action_type,
        cl.duration,
        cl.timestamp,
        s.id as session_id
      FROM content_logs cl
      JOIN sessions s ON cl.session_id = s.id
      WHERE s.device_id = $1
    `;
    const params: unknown[] = [deviceId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND cl.timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND cl.timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY cl.timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    return query(sql, params);
  }

  /**
   * 모든 기기별 영상 시청 요약
   */
  static async getAllDevicesWatchSummary(startDate?: Date, endDate?: Date) {
    let sql = `
      SELECT
        d.id as device_id,
        d.device_id as device_info,
        COUNT(DISTINCT cl.content_id) as unique_contents,
        COUNT(*) as total_views,
        SUM(CASE WHEN cl.action_type = 'WATCH_END' THEN cl.duration ELSE 0 END) as total_watch_time,
        MAX(cl.timestamp) as last_activity
      FROM devices d
      LEFT JOIN sessions s ON s.device_id = d.id
      LEFT JOIN content_logs cl ON cl.session_id = s.id AND cl.action_type IN ('SELECT', 'WATCH_END')
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (startDate) {
      sql += ` AND (cl.timestamp >= $${paramIndex++} OR cl.timestamp IS NULL)`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND (cl.timestamp <= $${paramIndex++} OR cl.timestamp IS NULL)`;
      params.push(endDate);
    }

    sql += `
      GROUP BY d.id, d.device_id
      ORDER BY last_activity DESC NULLS LAST
    `;

    return query(sql, params);
  }

  /**
   * 로그 삭제
   */
  static async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM content_logs WHERE id = $1 RETURNING id';
    const rows = await query(sql, [id]);
    return rows.length > 0;
  }

  /**
   * 여러 로그 일괄 삭제
   */
  static async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const sql = 'DELETE FROM content_logs WHERE id = ANY($1) RETURNING id';
    const rows = await query(sql, [ids]);
    return rows.length;
  }

  /**
   * 기간별 로그 삭제
   */
  static async deleteByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const sql = 'DELETE FROM content_logs WHERE timestamp >= $1 AND timestamp <= $2 RETURNING id';
    const rows = await query(sql, [startDate, endDate]);
    return rows.length;
  }

  /**
   * 기기별 로그 삭제
   */
  static async deleteByDeviceId(deviceId: string): Promise<number> {
    const sql = `
      DELETE FROM content_logs
      WHERE session_id IN (
        SELECT id FROM sessions WHERE device_id = $1
      )
      RETURNING id
    `;
    const rows = await query(sql, [deviceId]);
    return rows.length;
  }

  /**
   * 시간대별 콘텐츠 시청 분포 (오늘)
   */
  static async getHourlyWatchDistribution(date: Date) {
    const sql = `
      SELECT
        EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Seoul') as hour,
        COUNT(*) as watch_count
      FROM content_logs
      WHERE DATE(timestamp AT TIME ZONE 'Asia/Seoul') = DATE($1 AT TIME ZONE 'Asia/Seoul')
        AND action_type = 'WATCH_START'
      GROUP BY EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Seoul')
      ORDER BY hour
    `;
    return query(sql, [date]);
  }
}
