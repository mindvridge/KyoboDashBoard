'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { devicesApi } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { Monitor, Wifi, WifiOff, Search, Filter, Trash2, FlaskConical } from 'lucide-react';
import { useTestDeviceFilter } from '@/contexts/TestDeviceFilterContext';
import { isTestDevice } from '@/constants/testDevices';

interface Device {
  id: string;
  device_id: string;
  model?: string;
  is_active: boolean;
  last_seen?: string;
  created_at: string;
}

export default function DevicesPage() {
  const { showTestDevices } = useTestDeviceFilter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  const fetchDevices = async () => {
    try {
      const devicesRes = await devicesApi.getAll();
      if (devicesRes.success) {
        setDevices(devicesRes.data);
      }
    } catch (error) {
      // Error handling without console.error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Test device filter
      if (!showTestDevices && isTestDevice(device.device_id)) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          device.device_id?.toLowerCase().includes(query) ||
          device.model?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'online' && !device.is_active) return false;
        if (statusFilter === 'offline' && device.is_active) return false;
      }

      return true;
    });
  }, [devices, searchQuery, statusFilter, showTestDevices]);

  // Statistics
  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.is_active).length,
    offline: devices.filter(d => !d.is_active).length,
  }), [devices]);

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`"${device.device_id}" 기기를 삭제하시겠습니까?\n\n관련된 모든 세션과 로그도 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) return;

    setIsDeleting(device.id);
    try {
      const result = await devicesApi.delete(device.id);
      if (result.success) {
        alert(`기기가 삭제되었습니다.\n- 삭제된 로그: ${result.logs_deleted}건\n- 삭제된 세션: ${result.sessions_deleted}건`);
        fetchDevices();
      }
    } catch (error) {
      alert('기기 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="기기 관리" onRefresh={fetchDevices} isLoading={isLoading} />

        <main className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">전체 기기</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Monitor className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">온라인</p>
                    <p className="text-2xl font-bold text-green-600">{stats.online}</p>
                  </div>
                  <Wifi className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">오프라인</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.offline}</p>
                  </div>
                  <WifiOff className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="w-4 h-4 mr-2" />
                필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="기기 ID, 모델 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
                >
                  <option value="all">전체 상태</option>
                  <option value="online">온라인</option>
                  <option value="offline">오프라인</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Devices Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                기기 목록 ({filteredDevices.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {devices.length === 0 ? '등록된 기기가 없습니다.' : '검색 결과가 없습니다.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">기기 ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">모델</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">마지막 활동</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">등록일</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map((device) => (
                        <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {device.is_active ? (
                              <div className="flex items-center text-green-600">
                                <Wifi className="w-4 h-4 mr-1" />
                                <span className="text-sm">온라인</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <WifiOff className="w-4 h-4 mr-1" />
                                <span className="text-sm">오프라인</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-900">
                            <div className="flex items-center gap-2">
                              {device.device_id}
                              {isTestDevice(device.device_id) && (
                                <Badge variant="warning" className="text-xs flex items-center gap-1">
                                  <FlaskConical className="w-3 h-3" />
                                  테스트
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {device.model || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {device.last_seen ? formatDate(device.last_seen, 'MM-dd HH:mm') : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(device.created_at, 'yyyy-MM-dd')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDevice(device)}
                              disabled={isDeleting === device.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
