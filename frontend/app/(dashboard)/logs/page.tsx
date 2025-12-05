'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { logsApi, devicesApi } from '@/utils/api';
import { formatDate, getActionTypeLabel } from '@/utils/format';
import { format, subDays } from 'date-fns';
import { Filter, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react';

const actionColors: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  SELECT: 'info',
  WATCH_START: 'success',
  WATCH_END: 'default',
  WATCH_PAUSE: 'warning',
  WATCH_RESUME: 'success',
};

const MAX_WATCH_TIME = 20 * 60; // 20분 (초)

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
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
        const devicesRes = await devicesApi.getAll();
        if (devicesRes.success) setDevices(devicesRes.data);
      } catch {
        // Error handled silently
      }
    };
    fetchOptions();
  }, []);

  const fetchLogs = async () => {
    if (!isInitialized || !filters.startDate || !filters.endDate) return;

    setIsLoading(true);
    try {
      const response = await logsApi.getByDateRange({
        startDate: new Date(filters.startDate).toISOString(),
        endDate: new Date(filters.endDate + 'T23:59:59').toISOString(),
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
        setSelectedIds(new Set());
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, isInitialized]);

  const paginatedLogs = logs.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const totalPages = Math.ceil(logs.length / pagination.limit);

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLogs.map(log => log.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`선택한 ${selectedIds.size}개의 로그를 삭제하시겠습니까?`)) return;

    setIsDeleting(true);
    try {
      const result = await logsApi.deleteBulk(Array.from(selectedIds));
      if (result.success) {
        alert(`${result.deleted_count}개의 로그가 삭제되었습니다.`);
        fetchLogs();
      }
    } catch (error) {
      alert('로그 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert('기간을 선택해주세요.');
      return;
    }

    if (!confirm(`${filters.startDate} ~ ${filters.endDate} 기간의 모든 로그(${logs.length}건)를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

    setIsDeleting(true);
    try {
      const result = await logsApi.deleteByDateRange({
        startDate: new Date(filters.startDate).toISOString(),
        endDate: new Date(filters.endDate + 'T23:59:59').toISOString(),
      });
      if (result.success) {
        alert(`${result.deleted_count}개의 로그가 삭제되었습니다.`);
        fetchLogs();
      }
    } catch (error) {
      alert('로그 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (type: 'all' | 'current' | 'watch' | 'monthly' | 'yearly') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://kyobodashboard-production.up.railway.app';
    const token = localStorage.getItem('auth_token');

    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    const query = new URLSearchParams();
    query.set('format', 'csv');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let filename = 'logs';

    switch (type) {
      case 'current':
        if (filters.startDate) query.set('start_date', new Date(filters.startDate).toISOString());
        if (filters.endDate) query.set('end_date', new Date(filters.endDate + 'T23:59:59').toISOString());
        if (filters.deviceId) query.set('device_id', filters.deviceId);
        if (filters.actionType) query.set('action_type', filters.actionType);
        filename = `logs_${filters.startDate}_${filters.endDate}`;
        break;
      case 'watch':
        query.set('action_type', 'WATCH_END');
        if (filters.startDate) query.set('start_date', new Date(filters.startDate).toISOString());
        if (filters.endDate) query.set('end_date', new Date(filters.endDate + 'T23:59:59').toISOString());
        filename = `watch_logs_${filters.startDate}_${filters.endDate}`;
        break;
      case 'monthly': {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        query.set('start_date', monthStart.toISOString());
        query.set('end_date', monthEnd.toISOString());
        filename = `logs_${year}-${String(month).padStart(2, '0')}`;
        break;
      }
      case 'yearly': {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        query.set('start_date', yearStart.toISOString());
        query.set('end_date', yearEnd.toISOString());
        filename = `logs_${year}`;
        break;
      }
      case 'all':
      default: {
        const allStart = new Date();
        allStart.setFullYear(allStart.getFullYear() - 1);
        query.set('start_date', allStart.toISOString());
        query.set('end_date', now.toISOString());
        filename = 'logs_all';
        break;
      }
    }

    try {
      const response = await fetch(`${baseUrl}/api/stats/export/logs?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `다운로드 실패: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        alert('다운로드할 로그가 없습니다.');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(error instanceof Error ? error.message : '다운로드에 실패했습니다.');
    }
  };

  const formatWatchTime = (duration: number | null | undefined, actionType: string) => {
    if (duration == null || duration <= 0) {
      return actionType === 'WATCH_END' ? '0초' : '-';
    }
    // 최대 20분으로 제한
    const cappedDuration = Math.min(duration, MAX_WATCH_TIME);
    const minutes = Math.floor(cappedDuration / 60);
    const seconds = cappedDuration % 60;
    if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    }
    return `${seconds}초`;
  };

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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>로그 목록 ({logs.length}건)</CardTitle>
                <div className="flex items-center flex-wrap gap-2">
                  {/* Download Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('current')}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      현재 필터
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('watch')}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      시청 로그
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('monthly')}
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      월별
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload('yearly')}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      년도별
                    </Button>
                  </div>
                  {/* Delete Buttons */}
                  <div className="flex items-center gap-1">
                    {selectedIds.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        선택 삭제 ({selectedIds.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAll}
                      disabled={isDeleting || logs.length === 0}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      전체 삭제
                    </Button>
                  </div>
                </div>
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
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                            <input
                              type="checkbox"
                              checked={paginatedLogs.length > 0 && selectedIds.size === paginatedLogs.length}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">시간</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">기기</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">콘텐츠</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">이벤트</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">시청시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(log.id)}
                                onChange={() => handleSelectOne(log.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(log.timestamp, 'MM-dd HH:mm:ss')}
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
                              {formatWatchTime(log.duration, log.action_type)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      {logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} - {Math.min(pagination.page * pagination.limit, logs.length)} / {logs.length}건
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
                        {pagination.page} / {totalPages || 1}
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
