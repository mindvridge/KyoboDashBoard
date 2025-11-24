import cron from 'node-cron';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { AlertService } from './alertService';
import { StatsService } from './statsService';
import { RealtimeService } from './realtimeService';

export class SchedulerService {
  private static jobs: cron.ScheduledTask[] = [];

  /**
   * Initialize all scheduled jobs
   */
  static initialize(): void {
    // Clean up stale sessions every 5 minutes
    this.jobs.push(
      cron.schedule('*/5 * * * *', async () => {
        await this.cleanupStaleSessions();
      })
    );

    // Update device activity status every minute
    this.jobs.push(
      cron.schedule('* * * * *', async () => {
        await this.updateDeviceActivity();
      })
    );

    // Broadcast stats update every 30 seconds
    this.jobs.push(
      cron.schedule('*/30 * * * * *', async () => {
        await this.broadcastStatsUpdate();
      })
    );

    // Clean up old logs daily at 3 AM
    this.jobs.push(
      cron.schedule('0 3 * * *', async () => {
        await this.cleanupOldLogs();
      })
    );

    // Check for abnormal sessions every 2 minutes
    this.jobs.push(
      cron.schedule('*/2 * * * *', async () => {
        await this.checkAbnormalSessions();
      })
    );

    logger.info('Scheduler service initialized');
  }

  /**
   * Stop all scheduled jobs
   */
  static stop(): void {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    logger.info('Scheduler service stopped');
  }

  /**
   * Clean up sessions that have been active for too long (likely orphaned)
   */
  private static async cleanupStaleSessions(): Promise<void> {
    try {
      const maxSessionDuration = 3600 * 3; // 3 hours
      const sql = `
        UPDATE sessions
        SET
          end_time = NOW(),
          duration = $1,
          is_active = false
        WHERE is_active = true
          AND EXTRACT(EPOCH FROM (NOW() - start_time)) > $1
        RETURNING id
      `;
      const result = await query<{ id: string }>(sql, [maxSessionDuration]);

      if (result.length > 0) {
        logger.info('Cleaned up stale sessions', { count: result.length });
        result.forEach(session => {
          AlertService.createAlert({
            type: 'ABNORMAL_SESSION',
            message: `Session ${session.id} was forcefully ended after exceeding max duration`,
            severity: 'warning',
            session_id: session.id,
          });
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup stale sessions', { error });
    }
  }

  /**
   * Update device activity status based on last seen time
   */
  private static async updateDeviceActivity(): Promise<void> {
    try {
      const inactiveThreshold = 300; // 5 minutes
      const sql = `
        UPDATE devices
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true
          AND EXTRACT(EPOCH FROM (NOW() - last_seen)) > $1
        RETURNING id, device_id
      `;
      const result = await query<{ id: string; device_id: string }>(sql, [inactiveThreshold]);

      if (result.length > 0) {
        logger.info('Marked devices as inactive', { count: result.length });
        result.forEach(device => {
          RealtimeService.broadcastDeviceOffline(device.id);
        });
      }
    } catch (error) {
      logger.error('Failed to update device activity', { error });
    }
  }

  /**
   * Broadcast stats update to all connected clients
   */
  private static async broadcastStatsUpdate(): Promise<void> {
    try {
      const stats = await StatsService.getDashboardStats();
      RealtimeService.broadcastStatsUpdate(stats);
    } catch (error) {
      logger.error('Failed to broadcast stats update', { error });
    }
  }

  /**
   * Clean up old logs (older than 90 days by default)
   */
  private static async cleanupOldLogs(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90', 10);
      const sql = `
        DELETE FROM content_logs
        WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
      `;
      await query(sql);
      logger.info('Cleaned up old content logs', { retention_days: retentionDays });

      // Also clean up error logs
      const errorSql = `
        DELETE FROM error_logs
        WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
      `;
      await query(errorSql);
      logger.info('Cleaned up old error logs');
    } catch (error) {
      logger.error('Failed to cleanup old logs', { error });
    }
  }

  /**
   * Check for abnormal sessions
   */
  private static async checkAbnormalSessions(): Promise<void> {
    try {
      // Check for sessions with unusually long duration
      const sql = `
        SELECT s.id, s.device_id, d.device_id as device_info,
               EXTRACT(EPOCH FROM (NOW() - s.start_time)) as duration
        FROM sessions s
        JOIN devices d ON s.device_id = d.id
        WHERE s.is_active = true
          AND EXTRACT(EPOCH FROM (NOW() - s.start_time)) > 7200 -- 2 hours
      `;
      const result = await query<{ id: string; device_id: string; device_info: string; duration: number }>(sql);

      for (const session of result) {
        AlertService.createAlert({
          type: 'ABNORMAL_SESSION',
          message: `Session ${session.id} has been active for ${Math.round(session.duration / 60)} minutes`,
          severity: 'warning',
          device_id: session.device_id,
          session_id: session.id,
        });
      }
    } catch (error) {
      logger.error('Failed to check abnormal sessions', { error });
    }
  }
}
