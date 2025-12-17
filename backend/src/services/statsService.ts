import { SessionModel } from '../models/session';
import { ContentLogModel } from '../models/contentLog';
import { DeviceModel } from '../models/device';
import { DashboardStats } from '../types';
import { cacheGet, cacheSet } from '../config/redis';
import { getKoreaTodayRange } from '../utils/timezone';

// 기기 ID 별칭 매핑
const DEVICE_ALIASES: Record<string, string> = {
  '1baf4d59ed8e608f4fa67605991df079': '1번',
  '5f9a54ad6392878b29ba1f9da1c3d22f': '2번',
};

// 기기 ID를 별칭으로 변환
function getDeviceDisplayName(deviceId: string): string {
  return DEVICE_ALIASES[deviceId] || deviceId;
}

// 초를 "X분 Y초" 형식으로 변환
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return '-';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}초`;
  } else if (remainingSeconds === 0) {
    return `${minutes}분`;
  }
  return `${minutes}분 ${remainingSeconds}초`;
}

// UTC 시간을 한국 시간(KST)으로 변환하여 포맷
function formatToKoreanTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  // 한국 시간대로 변환 (UTC+9)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  return date.toLocaleString('ko-KR', options);
}

export class StatsService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'stats:dashboard';
    const cached = await cacheGet<DashboardStats>(cacheKey);
    if (cached) return cached;

    // 한국 시간(KST) 기준 오늘 날짜 범위
    const { start: today, end: tomorrow } = getKoreaTodayRange();

    const [
      activeSessions,
      todaySessionCount,
      totalWatchTime,
      popularContents,
      hourlyWatchDistribution,
    ] = await Promise.all([
      SessionModel.getActiveSessionCount(),
      SessionModel.getTodaySessionCount(),
      ContentLogModel.getTotalWatchTimeToday(),
      ContentLogModel.getPopularContents(today, tomorrow, 10),
      ContentLogModel.getHourlyWatchDistribution(today),
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
      hourly_sessions: Array.from({ length: 24 }, (_, hour) => {
        const found = (hourlyWatchDistribution as Array<{ hour: string; watch_count: string }>).find(h => parseInt(h.hour, 10) === hour);
        return {
          hour,
          session_count: found ? parseInt(found.watch_count, 10) : 0,
        };
      }),
    };

    await cacheSet(cacheKey, stats, 60); // 1 minute cache
    return stats;
  }

  /**
   * Get detailed statistics for a date range
   */
  static async getDetailedStats(startDate: Date, endDate: Date) {
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
   * Export data for CSV download
   */
  static async exportSessionData(startDate: Date, endDate: Date, options?: {
    deviceId?: string;
  }) {
    const sessions = await SessionModel.getSessionsByDateRange(
      startDate,
      endDate,
      undefined,
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
    deviceId?: string;
    actionType?: string;
  }) {
    const logs = await ContentLogModel.getLogsByDateRange(startDate, endDate, {
      deviceId: options?.deviceId,
      actionType: options?.actionType as any,
    });

    return logs.map((l: any) => ({
      log_id: l.id,
      session_id: l.session_id,
      device_id: getDeviceDisplayName(l.device_info || ''),
      content_id: l.content_id,
      content_name: l.content_name,
      action_type: l.action_type,
      timestamp: formatToKoreanTime(l.timestamp),
      duration: formatDuration(l.duration),
    }));
  }
}
