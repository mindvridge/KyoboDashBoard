'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logsApi } from '@/utils/api';
import { Clock, Eye, ExternalLink } from 'lucide-react';
import { formatDuration } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
          // WATCH_END(시청 완료)만 표시
          const viewLogs = result.data
            .filter((log: ViewLog) => log.action_type === 'WATCH_END')
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
            <div className="text-gray-500">오늘 시청 완료 기록이 없습니다</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            {title}
          </CardTitle>
          <Link href="/today-views">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ExternalLink className="w-4 h-4" />
              자세히 보기
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-y-auto">
          <div className="space-y-3">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {log.content_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(log.timestamp)}
                    </span>
                    {log.duration && log.duration > 0 && (
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
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  완료
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
