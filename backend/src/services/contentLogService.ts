import { ContentLogModel } from '../models/contentLog';
import { SessionModel } from '../models/session';
import { ContentLog, ContentActionType } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { cacheInvalidatePattern } from '../config/redis';
import { RealtimeService } from './realtimeService';

export class ContentLogService {
  /**
   * Log content selection
   */
  static async logContentSelect(
    sessionId: string,
    contentId: string,
    contentName: string,
    metadata?: Record<string, unknown>
  ): Promise<ContentLog> {
    // Verify session exists and is active
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    if (!session.is_active) {
      throw new ValidationError('Session is not active');
    }

    const log = await ContentLogModel.create({
      session_id: sessionId,
      content_id: contentId,
      content_name: contentName,
      action_type: 'SELECT',
      metadata,
    });

    // Invalidate stats cache
    await cacheInvalidatePattern('stats:content:*');

    // Broadcast real-time event
    RealtimeService.broadcastContentEvent(log);

    logger.info('Content selected', {
      session_id: sessionId,
      content_id: contentId,
      content_name: contentName,
    });

    return log;
  }

  /**
   * Log watch event (start, end, pause, resume)
   */
  static async logWatchEvent(
    sessionId: string,
    contentId: string,
    contentName: string,
    actionType: 'WATCH_START' | 'WATCH_END' | 'WATCH_PAUSE' | 'WATCH_RESUME',
    duration?: number,
    metadata?: Record<string, unknown>
  ): Promise<ContentLog> {
    // Verify session exists and is active
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    if (!session.is_active) {
      throw new ValidationError('Session is not active');
    }

    const log = await ContentLogModel.create({
      session_id: sessionId,
      content_id: contentId,
      content_name: contentName,
      action_type: actionType,
      duration,
      metadata,
    });

    // Invalidate stats cache
    await cacheInvalidatePattern('stats:content:*');

    // Broadcast real-time event
    RealtimeService.broadcastContentEvent(log);

    logger.info('Watch event logged', {
      session_id: sessionId,
      content_id: contentId,
      action_type: actionType,
      duration,
    });

    return log;
  }

  /**
   * Log lobby event
   */
  static async logLobbyEvent(
    sessionId: string,
    actionType: 'LOBBY_ENTER' | 'LOBBY_EXIT',
    metadata?: Record<string, unknown>
  ): Promise<ContentLog> {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    return ContentLogModel.create({
      session_id: sessionId,
      content_id: 'lobby',
      content_name: 'Lobby',
      action_type: actionType,
      metadata,
    });
  }

  /**
   * Log content switch event
   */
  static async logContentSwitch(
    sessionId: string,
    fromContentId: string,
    toContentId: string,
    toContentName: string,
    metadata?: Record<string, unknown>
  ): Promise<ContentLog> {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    return ContentLogModel.create({
      session_id: sessionId,
      content_id: toContentId,
      content_name: toContentName,
      action_type: 'CONTENT_SWITCH',
      metadata: { ...metadata, from_content_id: fromContentId },
    });
  }

  static async getLogsBySession(sessionId: string): Promise<ContentLog[]> {
    return ContentLogModel.findBySessionId(sessionId);
  }

  static async getRecentLogs(limit?: number) {
    return ContentLogModel.getRecentLogs(limit);
  }

  static async getPopularContents(startDate: Date, endDate: Date, limit?: number) {
    return ContentLogModel.getPopularContents(startDate, endDate, limit);
  }

  static async getTotalWatchTimeToday(): Promise<number> {
    return ContentLogModel.getTotalWatchTimeToday();
  }

  static async getContentStats(contentId: string, startDate: Date, endDate: Date) {
    return ContentLogModel.getContentStats(contentId, startDate, endDate);
  }

  static async getDailyStats(startDate: Date, endDate: Date) {
    return ContentLogModel.getDailyStats(startDate, endDate);
  }

  static async getHourlyDistribution(date: Date) {
    return ContentLogModel.getHourlyDistribution(date);
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
    return ContentLogModel.getLogsByDateRange(startDate, endDate, options);
  }
}
