'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { logsApi } from '@/utils/api';
import { formatDuration } from '@/utils/format';
import { Clock, PlayCircle, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useTestDeviceFilter } from '@/contexts/TestDeviceFilterContext';
import { isTestDevice, getDeviceDisplayName } from '@/constants/testDevices';

interface ViewLog {
  id: string;
  content_name: string;
  action_type: string;
  timestamp: string;
  duration?: number;
  device_id?: string;
  device_info?: string;
}

export default function TodayViewsPage() {
  const { showTestDevices } = useTestDeviceFilter();
  const [allLogs, setAllLogs] = useState<ViewLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 테스트 기기 필터링된 로그
  const logs = useMemo(() => {
    if (showTestDevices) {
      return allLogs;
    }
    return allLogs.filter(log => !log.device_id || !isTestDevice(log.device_id));
  }, [allLogs, showTestDevices]);

  const fetchTodayLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const result = await logsApi.getByDateRange({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
      });

      if (result.success) {
        // WATCH_START, WATCH_END만 표시
        const viewLogs = result.data.filter(
          (log: ViewLog) => ['WATCH_START', 'WATCH_END'].includes(log.action_type)
        );
        setAllLogs(viewLogs);
      }
    } catch (error) {
      console.error('Failed to fetch today logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayLogs();
    const interval = setInterval(fetchTodayLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchTodayLogs]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const totalWatchTime = logs
    .filter((log) => log.action_type === 'WATCH_END' && log.duration)
    .reduce((sum, log) => sum + (log.duration || 0), 0);

  const watchEndCount = logs.filter((log) => log.action_type === 'WATCH_END').length;
  const watchStartCount = logs.filter((log) => log.action_type === 'WATCH_START').length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="오늘 시청 현황" onRefresh={fetchTodayLogs} isLoading={isLoading} />

        <main className="p-6">
          {/* Back Button */}
          <div className="mb-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">시청 완료</p>
                    <p className="text-2xl font-bold text-gray-900">{watchEndCount}건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <PlayCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">시청 시작</p>
                    <p className="text-2xl font-bold text-gray-900">{watchStartCount}건</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 시청 시간</p>
                    <p className="text-2xl font-bold text-gray-900">{formatDuration(totalWatchTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                오늘 시청 기록 ({logs.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">오늘 시청 기록이 없습니다</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">시간</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">콘텐츠</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">기기</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">시청시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-600">{formatTime(log.timestamp)}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                            {log.content_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{log.device_info ? getDeviceDisplayName(log.device_info) : '-'}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={log.action_type === 'WATCH_END' ? 'success' : 'info'}
                            >
                              {log.action_type === 'WATCH_END' ? '완료' : '시작'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">
                            {log.action_type === 'WATCH_END' && log.duration
                              ? formatDuration(log.duration)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
