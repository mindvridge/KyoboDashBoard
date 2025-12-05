import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getKoreaDateRange, getKoreaTime } from '../utils/timezone';

export class SessionController {
  /**
   * POST /api/sessions/start
   * Start a new session
   */
  static async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.device) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Device not authenticated' },
        });
        return;
      }

      logger.info('Session start request', { device_id: req.device.device_id });

      const result = await SessionService.startSession(req.device.device_id);

      logger.info('Session started', {
        device_id: req.device.device_id,
        session_id: result.session_id,
      });

      // 응답 구조 단순화 - session_id를 최상위 레벨로
      res.status(201).json({
        success: true,
        session_id: result.session_id,
        start_time: result.start_time,
      });
    } catch (error) {
      logger.error('Session start failed', { error });
      next(error);
    }
  }

  /**
   * POST /api/sessions/end
   * End a session
   */
  static async end(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, lobby_time } = req.body;

      const result = await SessionService.endSession(session_id, lobby_time);

      // 응답 구조 단순화
      res.json({
        success: true,
        session_id: result.session_id,
        duration: result.duration,
        content_count: result.content_count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/active
   * Get all active sessions
   */
  static async getActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await SessionService.getActiveSessions();

      res.json({
        success: true,
        data: sessions,
        count: sessions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/:id
   * Get session by ID with logs
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const session = await SessionService.getSessionWithLogs(id);

      if (!session) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions
   * Get sessions by date range
   */
  static async getByDateRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, space_id, device_id } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(7);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const sessions = await SessionService.getSessionsByDateRange(
        startDate,
        endDate,
        space_id as string,
        device_id as string
      );

      res.json({
        success: true,
        data: sessions,
        count: sessions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/stats
   * Get session statistics
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(7);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const [stats, hourly] = await Promise.all([
        SessionService.getSessionStats(startDate, endDate),
        SessionService.getHourlyDistribution(getKoreaTime()),
      ]);

      res.json({
        success: true,
        data: {
          stats,
          hourly_distribution: hourly,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
