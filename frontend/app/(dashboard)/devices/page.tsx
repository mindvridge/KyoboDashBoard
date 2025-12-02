'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { devicesApi, spacesApi } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { Monitor, Wifi, WifiOff, Search, Filter } from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  device_info?: string;
  space_id?: string;
  space_name?: string;
  is_active: boolean;
  last_active_at?: string;
  session_count?: number;
  created_at: string;
}

interface Space {
  id: string;
  name: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [spaceFilter, setSpaceFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, spacesRes] = await Promise.all([
          devicesApi.getAll(),
          spacesApi.getAll(),
        ]);
        if (devicesRes.success) {
          setDevices(devicesRes.data);
        }
        if (spacesRes.success) {
          setSpaces(spacesRes.data);
        }
      } catch (error) {
        // Error handling without console.error
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          device.device_id?.toLowerCase().includes(query) ||
          device.device_info?.toLowerCase().includes(query) ||
          device.space_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'online' && !device.is_active) return false;
        if (statusFilter === 'offline' && device.is_active) return false;
      }

      // Space filter
      if (spaceFilter && device.space_id !== spaceFilter) {
        return false;
      }

      return true;
    });
  }, [devices, searchQuery, statusFilter, spaceFilter]);

  // Statistics
  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.is_active).length,
    offline: devices.filter(d => !d.is_active).length,
  }), [devices]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="기기 관리" />

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="기기 ID, 정보, 공간명 검색..."
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
                <Select
                  value={spaceFilter}
                  onChange={(e) => setSpaceFilter(e.target.value)}
                >
                  <option value="">전체 공간</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>{space.name}</option>
                  ))}
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">기기 정보</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">공간</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">마지막 활동</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">총 세션</th>
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
                            {device.device_id}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {device.device_info || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {device.space_name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {device.last_active_at ? formatDate(device.last_active_at, 'MM-dd HH:mm') : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 text-right">
                            {device.session_count || 0}회
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
