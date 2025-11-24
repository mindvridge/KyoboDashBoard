'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { logsApi, spacesApi, devicesApi } from '@/utils/api';
import { formatDate, getActionTypeLabel } from '@/utils/format';
import { format, subDays } from 'date-fns';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const actionColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  SELECT: 'info',
  WATCH_START: 'success',
  WATCH_END: 'default',
  WATCH_PAUSE: 'warning',
  WATCH_RESUME: 'success',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    spaceId: '',
    deviceId: '',
    actionType: '',
    search: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });

  // Initialize dates on client side to avoid hydration mismatch
  useEffect(() => {
    const now = new Date();
    setFilters(prev => ({
      ...prev,
      startDate: format(subDays(now, 7), 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
    }));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [spacesRes, devicesRes] = await Promise.all([
          spacesApi.getAll(),
          devicesApi.getAll(),
        ]);
        if (spacesRes.success) setSpaces(spacesRes.data);
        if (devicesRes.success) setDevices(devicesRes.data);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!isInitialized || !filters.startDate || !filters.endDate) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await logsApi.getByDateRange({
          startDate: new Date(filters.startDate).toISOString(),
          endDate: new Date(filters.endDate + 'T23:59:59').toISOString(),
          spaceId: filters.spaceId || undefined,
          deviceId: filters.deviceId || undefined,
        });
        if (response.success) {
          let filteredLogs = response.data;

          // Filter by action type
          if (filters.actionType) {
            filteredLogs = filteredLogs.filter((l: any) => l.action_type === filters.actionType);
          }

          // Filter by search term
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter((l: any) =>
              l.content_name?.toLowerCase().includes(searchLower) ||
              l.device_info?.toLowerCase().includes(searchLower)
            );
          }

          setLogs(filteredLogs);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [filters, isInitialized]);

  const paginatedLogs = logs.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const totalPages = Math.ceil(logs.length / pagination.limit);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="로그 조회" />

        <main className="p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Input
                  type="date"
                  label="시작일"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  label="종료일"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
                <Select
                  label="공간"
                  value={filters.spaceId}
                  onChange={(e) => setFilters({ ...filters, spaceId: e.target.value })}
                >
                  <option value="">전체</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>{space.name}</option>
                  ))}
                </Select>
                <Select
                  label="기기"
                  value={filters.deviceId}
                  onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
                >
                  <option value="">전체</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>{device.device_id}</option>
                  ))}
                </Select>
                <Select
                  label="이벤트 유형"
                  value={filters.actionType}
                  onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                >
                  <option value="">전체</option>
                  <option value="SELECT">콘텐츠 선택</option>
                  <option value="WATCH_START">시청 시작</option>
                  <option value="WATCH_END">시청 완료</option>
                  <option value="WATCH_PAUSE">일시 정지</option>
                  <option value="WATCH_RESUME">재생 재개</option>
                </Select>
                <div className="relative">
                  <Input
                    label="검색"
                    placeholder="콘텐츠명, 기기..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>로그 목록 ({logs.length}건)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">시간</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">공간</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">기기</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">콘텐츠</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">이벤트</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">시청시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(log.timestamp, 'MM-dd HH:mm:ss')}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {log.space_name || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {log.device_info || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                              {log.content_name}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={actionColors[log.action_type] || 'default'}>
                                {getActionTypeLabel(log.action_type)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              {log.duration ? `${log.duration}초` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, logs.length)} / {logs.length}건
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-600">
                        {pagination.page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                        disabled={pagination.page >= totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
