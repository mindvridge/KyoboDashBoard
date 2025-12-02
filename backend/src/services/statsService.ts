import { SessionModel } from '../models/session';
import { ContentLogModel } from '../models/contentLog';
import { DeviceModel } from '../models/device';
import { SpaceModel } from '../models/space';
import { DashboardStats } from '../types';
import { cacheGet, cacheSet } from '../config/redis';
import { logger } from '../utils/logger';

export class StatsService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'stats:dashboard';
    const cached = await cacheGet<DashboardStats>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeSessions,
      todaySessionCount,
      totalWatchTime,
      popularContents,
      spaces,
      hourlyDistribution,
    ] = await Promise.all([
      SessionModel.getActiveSessionCount(),
      SessionModel.getTodaySessionCount(),
      ContentLogModel.getTotalWatchTimeToday(),
      ContentLogModel.getPopularContents(today, tomorrow, 10),
      SpaceModel.getWithStats(),
      SessionModel.getHourlySessionDistribution(today),
    ]);

    const stats: DashboardStats = {
      active_sessions: activeSessions,
      total_sessions_today: todaySessionCount,
      total_watch_time_today: totalWatchTime,
      popular_contents: popularContents.map((c: any) => ({
        content_id: c.content_id,
        content_name: c.content_name,
        view_count: parseInt(c.view_count, 10),
        total_watch_time: parseInt(c.total_watch_time || '0', 10),
      })),
      space_stats: spaces.map((s: any) => ({
        space_id: s.id,
        space_name: s.name,
        active_devices: parseInt(s.device_count || '0', 10),
        total_sessions: parseInt(s.active_sessions || '0', 10),
        avg_session_duration: 0, // Would need separate query
      })),
      hourly_sessions: Array.from({ length: 24 }, (_, hour) => {
        const found = (hourlyDistribution as Array<{ hour: string; session_count: string }>).find(h => parseInt(h.hour, 10) === hour);
        return {
          hour,
          session_count: found ? parseInt(found.session_count, 10) : 0,
        };
      }),
    };

    await cacheSet(cacheKey, stats, 60); // 1 minute cache
    return stats;
  }

  /**
   * Get detailed statistics for a date range
   */
  static async getDetailedStats(startDate: Date, endDate: Date, spaceId?: string) {
    const [sessionStats, dailyContentStats, popularContents] = await Promise.all([
      SessionModel.getSessionStats(startDate, endDate),
      ContentLogModel.getDailyStats(startDate, endDate),
      ContentLogModel.getPopularContents(startDate, endDate, 20),
    ]);

    return {
      session_stats: sessionStats,
      daily_stats: dailyContentStats,
      popular_contents: popularContents,
    };
  }

  /**
   * Get space-specific statistics
   */
  static async getSpaceStats(spaceId: string, startDate: Date, endDate: Date) {
    const [sessions, devices] = await Promise.all([
      SessionModel.getSessionsByDateRange(startDate, endDate, spaceId),
      DeviceModel.findAll(),  // space_id 필터 제거됨
    ]);

    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    return {
      total_sessions: sessions.length,
      total_devices: devices.length,
      active_devices: devices.filter(d => d.is_active).length,
      total_duration: totalDuration,
      avg_session_duration: Math.round(avgDuration),
    };
  }

  /**
   * Export data for CSV download
   */
  static async exportSessionData(startDate: Date, endDate: Date, options?: {
    spaceId?: string;
    deviceId?: string;
  }) {
    const sessions = await SessionModel.getSessionsByDateRange(
      startDate,
      endDate,
      options?.spaceId,
      options?.deviceId
    );

    return sessions.map((s: any) => ({
      session_id: s.id,
      device_id: s.device_info,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_seconds: s.duration,
      lobby_time_seconds: s.lobby_time,
    }));
  }

  static async exportContentLogData(startDate: Date, endDate: Date, options?: {
    spaceId?: string;
    deviceId?: string;
  }) {
    const logs = await ContentLogModel.getLogsByDateRange(startDate, endDate, options);

    return logs.map((l: any) => ({
      log_id: l.id,
      session_id: l.session_id,
      device_id: l.device_info,
      content_id: l.content_id,
      content_name: l.content_name,
      action_type: l.action_type,
      timestamp: l.timestamp,
      duration_seconds: l.duration,
    }));
  }
}
