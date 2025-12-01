'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { devicesApi } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { Monitor, Wifi, WifiOff } from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await devicesApi.getAll();
        if (response.success) {
          setDevices(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDevices();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="기기 관리" />

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                등록된 기기 ({devices.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  등록된 기기가 없습니다.
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
                      {devices.map((device) => (
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
