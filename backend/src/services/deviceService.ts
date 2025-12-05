import { DeviceModel } from '../models/device';
import { SessionModel } from '../models/session';
import { ContentLogModel } from '../models/contentLog';
import { generateToken } from '../middleware/auth';
import { Device, DeviceRegistrationRequest, DeviceRegistrationResponse } from '../types';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet, cacheDelete } from '../config/redis';
import { NotFoundError } from '../utils/errors';

const CACHE_TTL = 300; // 5 minutes

export class DeviceService {
  /**
   * Register a device or return existing device with token
   * This handles auto-registration for VR devices
   */
  static async registerOrLogin(data: DeviceRegistrationRequest): Promise<DeviceRegistrationResponse> {
    // Check if device already exists
    let device = await DeviceModel.findByDeviceId(data.device_id);
    let isNewDevice = false;

    if (device) {
      // Update last seen and return token
      await DeviceModel.updateLastSeen(device.id);
      logger.info('Device logged in', { device_id: data.device_id });
    } else {
      // Create new device
      device = await DeviceModel.create({
        device_id: data.device_id,
        mac_address: data.mac_address,
        model: data.model,
      });
      isNewDevice = true;
      logger.info('New device registered', { device_id: data.device_id });
    }

    // Generate JWT token
    const token = generateToken(device.id);

    // Clear cache
    await cacheDelete(`device:${device.id}`);

    return {
      success: true,
      device,
      token,
      is_new_device: isNewDevice,
    };
  }

  static async getDeviceById(id: string): Promise<Device | null> {
    // Try cache first
    const cached = await cacheGet<Device>(`device:${id}`);
    if (cached) return cached;

    const device = await DeviceModel.findById(id);
    if (device) {
      await cacheSet(`device:${id}`, device, CACHE_TTL);
    }
    return device;
  }

  static async getDeviceByDeviceId(deviceId: string): Promise<Device | null> {
    return DeviceModel.findByDeviceId(deviceId);
  }

  static async getAllDevices(): Promise<Device[]> {
    return DeviceModel.findAll();
  }

  static async getActiveDevices(): Promise<Device[]> {
    return DeviceModel.getActiveDevices();
  }

  static async updateDevice(id: string, data: Partial<Device>): Promise<Device> {
    const device = await DeviceModel.update(id, data);
    if (!device) {
      throw new NotFoundError('Device not found');
    }
    await cacheDelete(`device:${id}`);
    return device;
  }

  static async setDeviceInactive(id: string): Promise<void> {
    await DeviceModel.setInactive(id);
    await cacheDelete(`device:${id}`);

    // End any active sessions for this device
    const activeSession = await SessionModel.findActiveByDeviceId(id);
    if (activeSession) {
      await SessionModel.endSession(activeSession.id);
      logger.info('Session ended due to device inactivity', { session_id: activeSession.id });
    }
  }

  static async deleteDevice(id: string): Promise<{ logsDeleted: number; sessionsDeleted: number }> {
    // 먼저 관련 로그 삭제
    const logsDeleted = await ContentLogModel.deleteByDeviceId(id);
    logger.info('Deleted logs for device', { device_id: id, logs_deleted: logsDeleted });

    // 세션 삭제 (CASCADE로 처리될 수도 있음)
    const sessionsDeleted = await SessionModel.deleteByDeviceId(id);
    logger.info('Deleted sessions for device', { device_id: id, sessions_deleted: sessionsDeleted });

    // 디바이스 삭제
    await DeviceModel.delete(id);
    await cacheDelete(`device:${id}`);

    return { logsDeleted, sessionsDeleted };
  }
}
