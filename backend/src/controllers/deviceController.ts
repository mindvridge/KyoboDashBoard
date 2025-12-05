import { Request, Response, NextFunction } from 'express';
import { DeviceService } from '../services/deviceService';
import { DeviceModel } from '../models/device';
import { ContentLogModel } from '../models/contentLog';
import { DeviceRegistrationRequest } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { formatKoreaISO, getKoreaDateRange } from '../utils/timezone';

export class DeviceController {
  /**
   * POST /api/devices/register
   * Auto-register a device or login existing device
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: DeviceRegistrationRequest = req.body;

      logger.info('Device registration request', { device_id: data.device_id });

      const result = await DeviceService.registerOrLogin(data);

      logger.info('Device registration success', {
        device_id: data.device_id,
        is_new: result.is_new_device,
        has_token: !!result.token,
      });

      // 응답 구조 단순화 - token을 최상위 레벨로
      res.status(result.is_new_device ? 201 : 200).json({
        success: true,
        device: result.device,
        token: result.token,
        is_new_device: result.is_new_device,
      });
    } catch (error) {
      logger.error('Device registration failed', { error });
      next(error);
    }
  }

  /**
   * GET /api/devices
   * Get all devices
   */
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await DeviceService.getAllDevices();

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/devices/active
   * Get all active devices
   */
  static async getActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await DeviceService.getActiveDevices();

      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/devices/:id
   * Get device by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const device = await DeviceService.getDeviceById(id);

      if (!device) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Device not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/devices/:id
   * Update device information
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const device = await DeviceService.updateDevice(id, req.body);

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/devices/:id
   * Delete a device
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await DeviceService.deleteDevice(id);

      res.json({
        success: true,
        message: 'Device deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/devices/heartbeat
   * Device heartbeat to update last seen
   * Optimized: directly updates last_seen without extra SELECT query
   */
  static async heartbeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.device) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Device not authenticated' },
        });
        return;
      }

      // Direct update without SELECT - device is already authenticated
      // This reduces 2 queries (SELECT + UPDATE) to just 1 UPDATE
      await DeviceModel.updateLastSeen(req.device.device_id);

      res.json({
        success: true,
        message: 'Heartbeat received',
        timestamp: formatKoreaISO(new Date()),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/devices/:id/watch-history
   * 기기별 영상 시청 내역 (요약)
   */
  static async getWatchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date ? new Date(start_date as string) : defaultRange.start;
      const endDate = end_date ? new Date(end_date as string) : defaultRange.end;

      const history = await ContentLogModel.getWatchHistoryByDevice(id, startDate, endDate);

      res.json({
        success: true,
        data: history.map((h: any) => ({
          content_id: h.content_id,
          content_name: h.content_name,
          view_count: parseInt(h.view_count, 10),
          total_watch_time: parseInt(h.total_watch_time || '0', 10),
          last_watched: h.last_watched,
          first_watched: h.first_watched,
        })),
        count: history.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/devices/:id/watch-logs
   * 기기별 상세 시청 로그
   */
  static async getWatchLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date, limit } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(7);
      const startDate = start_date ? new Date(start_date as string) : defaultRange.start;
      const endDate = end_date ? new Date(end_date as string) : defaultRange.end;
      const logLimit = limit ? parseInt(limit as string) : 100;

      const logs = await ContentLogModel.getDetailedWatchLogsByDevice(id, startDate, endDate, logLimit);

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
   * GET /api/devices/watch-summary
   * 모든 기기별 영상 시청 요약
   */
  static async getAllWatchSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      // 한국 시간(KST) 기준 날짜 범위
      const defaultRange = getKoreaDateRange(30);
      const startDate = start_date ? new Date(start_date as string) : defaultRange.start;
      const endDate = end_date ? new Date(end_date as string) : defaultRange.end;

      const summary = await ContentLogModel.getAllDevicesWatchSummary(startDate, endDate);

      res.json({
        success: true,
        data: summary.map((s: any) => ({
          device_id: s.device_id,
          device_info: s.device_info,
          unique_contents: parseInt(s.unique_contents || '0', 10),
          total_views: parseInt(s.total_views || '0', 10),
          total_watch_time: parseInt(s.total_watch_time || '0', 10),
          last_activity: s.last_activity,
        })),
        count: summary.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
