import { Request, Response, NextFunction } from 'express';
import { ContentLogService } from '../services/contentLogService';
import { AuthenticatedRequest } from '../middleware/auth';
import { getKoreaDateRange } from '../utils/timezone';

export class LogController {
  /**
   * POST /api/logs/content-select
   * Log content selection
   */
  static async contentSelect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, content_id, content_name, metadata } = req.body;

      const log = await ContentLogService.logContentSelect(
        session_id,
        content_id,
        content_name,
        metadata
      );

      res.status(201).json({
        success: true,
        data: { log_id: log.id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/logs/content-watch
   * Log watch events (start, end, pause, resume)
   */
  static async contentWatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, content_id, content_name, action_type, duration, metadata } = req.body;

      const log = await ContentLogService.logWatchEvent(
        session_id,
        content_id,
        content_name,
        action_type,
        duration,
        metadata
      );

      res.status(201).json({
        success: true,
        data: { log_id: log.id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/logs/lobby
   * Log lobby events
   */
  static async lobby(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, action_type, metadata } = req.body;

      const log = await ContentLogService.logLobbyEvent(session_id, action_type, metadata);

      res.status(201).json({
        success: true,
        data: { log_id: log.id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/logs/content-switch
   * Log content switch event
   */
  static async contentSwitch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { session_id, from_content_id, to_content_id, to_content_name, metadata } = req.body;

      const log = await ContentLogService.logContentSwitch(
        session_id,
        from_content_id,
        to_content_id,
        to_content_name,
        metadata
      );

      res.status(201).json({
        success: true,
        data: { log_id: log.id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/logs/recent
   * Get recent logs
   */
  static async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await ContentLogService.getRecentLogs(limit);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/logs/session/:sessionId
   * Get logs for a specific session
   */
  static async getBySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const logs = await ContentLogService.getLogsBySession(sessionId);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/logs
   * Get logs by date range with filters
   */
  static async getByDateRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        start_date,
        end_date,
        device_id,
        content_id,
        action_type,
        limit,
        offset,
      } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(1); // Default: last 24 hours
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const logs = await ContentLogService.getLogsByDateRange(startDate, endDate, {
        deviceId: device_id as string,
        contentId: content_id as string,
        actionType: action_type as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/logs/content/:contentId/stats
   * Get statistics for specific content
   */
  static async getContentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contentId } = req.params;
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(7);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const stats = await ContentLogService.getContentStats(contentId, startDate, endDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
