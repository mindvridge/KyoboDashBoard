import { Request, Response, NextFunction } from 'express';
import { DeviceService } from '../services/deviceService';
import { DeviceModel } from '../models/device';
import { DeviceRegistrationRequest } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class DeviceController {
  /**
   * POST /api/devices/register
   * Auto-register a device or login existing device
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: DeviceRegistrationRequest = req.body;

      const result = await DeviceService.registerOrLogin(data);

      res.status(result.is_new_device ? 201 : 200).json({
        success: true,
        data: result,
      });
    } catch (error) {
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
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
