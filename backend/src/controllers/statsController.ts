import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService';
import { ContentLogService } from '../services/contentLogService';
import { AlertService } from '../services/alertService';
import { getKoreaDateRange, getKoreaTime } from '../utils/timezone';

export class StatsController {
  /**
   * GET /api/stats/dashboard
   * Get real-time dashboard statistics
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await StatsService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/detailed
   * Get detailed statistics for date range
   */
  static async getDetailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const stats = await StatsService.getDetailedStats(startDate, endDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/popular
   * Get popular content statistics
   */
  static async getPopular(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, limit } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(7);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const popularContents = await ContentLogService.getPopularContents(
        startDate,
        endDate,
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        success: true,
        data: popularContents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/daily
   * Get daily statistics
   */
  static async getDaily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const dailyStats = await ContentLogService.getDailyStats(startDate, endDate);

      res.json({
        success: true,
        data: dailyStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/hourly
   * Get hourly distribution for a specific date
   */
  static async getHourly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query;
      // 한국 시간(KST) 기준
      const targetDate = date ? new Date(date as string) : getKoreaTime();

      const hourlyStats = await ContentLogService.getHourlyDistribution(targetDate);

      res.json({
        success: true,
        data: hourlyStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/export/sessions
   * Export session data as JSON (can be converted to CSV)
   */
  static async exportSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, device_id, format } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const data = await StatsService.exportSessionData(startDate, endDate, {
        deviceId: device_id as string,
      });

      if (format === 'csv') {
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data,
          count: data.length,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/export/logs
   * Export content logs
   */
  static async exportLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, device_id, format } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date
        ? new Date(start_date as string)
        : defaultRange.start;

      const endDate = end_date
        ? new Date(end_date as string)
        : defaultRange.end;

      const data = await StatsService.exportContentLogData(startDate, endDate, {
        deviceId: device_id as string,
      });

      if (format === 'csv') {
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=content_logs.csv');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data,
          count: data.length,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/stats/alerts
   * Get active alerts
   */
  static async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alerts = await AlertService.getActiveAlerts();

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/stats/alerts/:id/resolve
   * Resolve an alert
   */
  static async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const alert = await AlertService.resolveAlert(id);

      if (!alert) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Helper function to convert array of objects to CSV
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');

  const rows = data.map(item =>
    headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );

  return [headerRow, ...rows].join('\n');
}
