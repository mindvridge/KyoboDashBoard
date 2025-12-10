'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { logsApi } from '@/utils/api';
import { PlayCircle, Clock, Eye } from 'lucide-react';
import { formatDuration } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';

interface TodayViewsChartProps {
  title?: string;
}

interface ViewLog {
  content_name: string;
  action_type: string;
  timestamp: string;
  duration?: number;
  device_info?: string;
}

export function TodayViewsChart({ title = '오늘 시청 현황' }: TodayViewsChartProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<ViewLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 인증 확인 전에는 API 호출하지 않음
    if (authLoading || !isAuthenticated) {
      return;
    }

    const fetchTodayLogs = async () => {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const result = await logsApi.getByDateRange({
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
        });

        if (result.success) {
          // Filter to show only WATCH_START and WATCH_END actions (exclude SELECT)
          const viewLogs = result.data
            .filter((log: ViewLog) => ['WATCH_START', 'WATCH_END'].includes(log.action_type))
            .slice(0, 10);
          setLogs(viewLogs);
        }
      } catch (error) {
        console.error('Failed to fetch today logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayLogs();
    const interval = setInterval(fetchTodayLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-gray-500">오늘 시청 기록이 없습니다</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-y-auto">
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  log.action_type === 'WATCH_START'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {log.action_type === 'WATCH_START' ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {log.content_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(log.timestamp)}
                    </span>
                    {log.action_type === 'WATCH_END' && log.duration && (
                      <span className="text-xs text-green-600">
                        {formatDuration(log.duration)} 시청
                      </span>
                    )}
                    {log.device_info && (
                      <span className="text-xs text-gray-400 truncate max-w-[100px]">
                        {log.device_info}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  log.action_type === 'WATCH_START'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {log.action_type === 'WATCH_START' ? '시작' : '완료'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
