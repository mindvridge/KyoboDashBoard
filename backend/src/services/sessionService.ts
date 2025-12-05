import { SessionModel } from '../models/session';
import { ContentLogModel } from '../models/contentLog';
import { DeviceModel } from '../models/device';
import { Session, SessionStartResponse, SessionEndResponse } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ConflictError } from '../utils/errors';
import { cacheGet, cacheSet, cacheDelete, cacheInvalidatePattern } from '../config/redis';
import { RealtimeService } from './realtimeService';
import { transaction } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { formatKoreaISO } from '../utils/timezone';

export class SessionService {
  /**
   * Start a new session for a device
   * Ends any existing active session for the device
   * Uses transaction to prevent race conditions
   */
  static async startSession(deviceId: string): Promise<SessionStartResponse> {
    // Verify device exists
    const device = await DeviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundError('Device not found');
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const session = await transaction(async (client) => {
      // Check for existing active session with FOR UPDATE lock
      const existingSessionSql = `
        SELECT * FROM sessions
        WHERE device_id = $1 AND is_active = true
        ORDER BY start_time DESC
        LIMIT 1
        FOR UPDATE
      `;
      const existingSessions = await client.query<Session>(existingSessionSql, [deviceId]);
      const existingSession = existingSessions.rows[0];

      if (existingSession) {
        // End existing session before starting new one
        const endSessionSql = `
          UPDATE sessions
          SET
            end_time = NOW(),
            duration = EXTRACT(EPOCH FROM (NOW() - start_time))::integer,
            is_active = false
          WHERE id = $1
          RETURNING *
        `;
        await client.query(endSessionSql, [existingSession.id]);
        logger.info('Ended previous session', { session_id: existingSession.id });
      }

      // Create new session
      const newSessionId = uuidv4();
      const createSessionSql = `
        INSERT INTO sessions (id, device_id, start_time, is_active, created_at)
        VALUES ($1, $2, NOW(), true, NOW())
        RETURNING *
      `;
      const newSessionResult = await client.query<Session>(createSessionSql, [newSessionId, deviceId]);
      return newSessionResult.rows[0];
    });

    // Update device last seen (outside transaction)
    await DeviceModel.updateLastSeen(deviceId);

    // Invalidate stats cache
    await cacheInvalidatePattern('stats:*');

    // Broadcast real-time event
    RealtimeService.broadcastSessionStart(session, device.device_id);

    logger.info('Session started', {
      session_id: session.id,
      device_id: deviceId,
    });

    return {
      success: true,
      session_id: session.id,
      start_time: session.start_time,
    };
  }

  /**
   * End a session
   */
  static async endSession(sessionId: string, lobbyTime?: number): Promise<SessionEndResponse> {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (!session.is_active) {
      throw new ConflictError('Session is already ended');
    }

    // End the session
    const endedSession = await SessionModel.endSession(sessionId, lobbyTime);
    if (!endedSession) {
      throw new NotFoundError('Failed to end session');
    }

    // Get content count for this session
    const logs = await ContentLogModel.findBySessionId(sessionId);
    const contentCount = new Set(logs.map(l => l.content_id)).size;

    // Invalidate cache
    await cacheInvalidatePattern('stats:*');
    await cacheDelete(`session:${sessionId}`);

    // Broadcast real-time event
    RealtimeService.broadcastSessionEnd(endedSession);

    logger.info('Session ended', {
      session_id: sessionId,
      duration: endedSession.duration,
      content_count: contentCount,
    });

    return {
      success: true,
      session_id: sessionId,
      duration: endedSession.duration || 0,
      content_count: contentCount,
    };
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    return SessionModel.findById(sessionId);
  }

  static async getSessionWithLogs(sessionId: string) {
    return SessionModel.getSessionWithLogs(sessionId);
  }

  static async getActiveSessions(): Promise<Array<Session & { device_info: string }>> {
    const cached = await cacheGet<Array<Session & { device_info: string }>>('active_sessions');
    if (cached) return cached;

    const sessions = await SessionModel.getActiveSessions();
    await cacheSet('active_sessions', sessions, 30); // 30 seconds cache
    return sessions;
  }

  static async getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    spaceId?: string,
    deviceId?: string
  ) {
    return SessionModel.getSessionsByDateRange(startDate, endDate, spaceId, deviceId);
  }

  static async getSessionStats(startDate: Date, endDate: Date) {
    // 한국 시간(KST) 기준 캐시 키 생성
    const cacheKey = `stats:sessions:${formatKoreaISO(startDate)}:${formatKoreaISO(endDate)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const stats = await SessionModel.getSessionStats(startDate, endDate);
    await cacheSet(cacheKey, stats, 300);
    return stats;
  }

  static async getHourlyDistribution(date: Date) {
    return SessionModel.getHourlySessionDistribution(date);
  }

  static async getTodaySessionCount(): Promise<number> {
    return SessionModel.getTodaySessionCount();
  }

  static async getActiveSessionCount(): Promise<number> {
    return SessionModel.getActiveSessionCount();
  }
}
