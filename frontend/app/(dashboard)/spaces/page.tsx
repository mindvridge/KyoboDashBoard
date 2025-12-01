'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { spacesApi } from '@/utils/api';
import { MapPin, Monitor, Users } from 'lucide-react';

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await spacesApi.getAll();
        if (response.success) {
          setSpaces(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch spaces:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSpaces();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="공간 관리" />

        <main className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                등록된 공간 ({spaces.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : spaces.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  등록된 공간이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spaces.map((space) => (
                    <Card key={space.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{space.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{space.description || '설명 없음'}</p>
                          </div>
                          <Badge variant={space.is_active ? 'success' : 'default'}>
                            {space.is_active ? '활성' : '비활성'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Monitor className="w-4 h-4 mr-1" />
                            {space.device_count || 0}개 기기
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {space.session_count || 0}개 세션
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
