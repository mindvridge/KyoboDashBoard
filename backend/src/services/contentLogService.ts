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

    // WATCH_END에서 서버 타임스탬프 기준으로 duration 계산 (우선)
    // 클라이언트에서 보낸 duration은 참고용으로만 사용
    let calculatedDuration = duration;
    if (actionType === 'WATCH_END') {
      const watchStart = await ContentLogModel.findLastWatchStart(sessionId, contentId);
      if (watchStart && watchStart.timestamp) {
        const startTime = new Date(watchStart.timestamp).getTime();
        const endTime = Date.now();
        const rawDuration = Math.floor((endTime - startTime) / 1000); // 초 단위

        // 최대 30분(1800초)으로 제한, 음수 방지
        calculatedDuration = Math.max(0, Math.min(rawDuration, 1800));

        logger.info('Calculated watch duration from server timestamps', {
          session_id: sessionId,
          content_id: contentId,
          watch_start_session: watchStart.session_id,
          start_time: watchStart.timestamp,
          raw_duration: rawDuration,
          calculated_duration: calculatedDuration,
          client_duration: duration,
        });
      } else {
        // WATCH_START를 못 찾으면 클라이언트 값 사용 (fallback)
        if (duration && duration > 0) {
          calculatedDuration = Math.min(duration, 1800);
          logger.warn('Using client duration (no WATCH_START found)', {
            session_id: sessionId,
            content_id: contentId,
            client_duration: duration,
          });
        } else {
          logger.warn('No WATCH_START found and no client duration', {
            session_id: sessionId,
            content_id: contentId,
          });
        }
      }
    }

    const log = await ContentLogModel.create({
      session_id: sessionId,
      content_id: contentId,
      content_name: contentName,
      action_type: actionType,
      duration: calculatedDuration,
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
