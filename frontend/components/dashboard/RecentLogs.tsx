'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { logsApi } from '@/utils/api';
import { ContentLog } from '@/types';
import { formatDate, getActionTypeLabel } from '@/utils/format';
import { Play, Pause, Square, MousePointer, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const actionIcons: Record<string, typeof Play> = {
  SELECT: MousePointer,
  WATCH_START: Play,
  WATCH_END: Square,
  WATCH_PAUSE: Pause,
  WATCH_RESUME: Play,
  CONTENT_SWITCH: ArrowRight,
};

const actionColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  SELECT: 'info',
  WATCH_START: 'success',
  WATCH_END: 'default',
  WATCH_PAUSE: 'warning',
  WATCH_RESUME: 'success',
  CONTENT_SWITCH: 'info',
};

export function RecentLogs() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<ContentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 인증 확인 전에는 API 호출하지 않음
    if (authLoading || !isAuthenticated) {
      return;
    }

    const fetchLogs = async () => {
      try {
        const response = await logsApi.getRecent(30);
        if (response.success) {
          // 모든 로그 표시 (SELECT, WATCH_START, WATCH_END 등)
          setLogs(response.data.slice(0, 20));
        }
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [authLoading, isAuthenticated]);

  if (authLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {logs.map((log) => {
            const Icon = actionIcons[log.action_type] || MousePointer;
            const badgeVariant = actionColors[log.action_type] || 'default';

            return (
              <div
                key={log.id}
                className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.content_name}
                    </p>
                    <Badge variant={badgeVariant} className="text-xs">
                      {getActionTypeLabel(log.action_type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(log.timestamp, 'HH:mm:ss')} - {log.device_info || '기기'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
