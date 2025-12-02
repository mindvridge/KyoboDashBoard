'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { statsApi, spacesApi } from '@/utils/api';
import { formatNumber, formatDuration } from '@/utils/format';
import { format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Download, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7');
  const [spaceId, setSpaceId] = useState('');
  const [spaces, setSpaces] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [popularContents, setPopularContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await spacesApi.getAll();
        if (response.success) {
          setSpaces(response.data);
        }
      } catch {
        // Error handled silently
      }
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const endDate = new Date();
        const startDate = subDays(endDate, parseInt(dateRange));

        const [dailyRes, popularRes] = await Promise.all([
          statsApi.getDaily({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
          statsApi.getPopular({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 10,
          }),
        ]);

        if (dailyRes.success) {
          setDailyStats(dailyRes.data.map((d: any) => ({
            ...d,
            date: format(new Date(d.date), 'MM/dd'),
            total_events: parseInt(d.total_events),
            unique_sessions: parseInt(d.unique_sessions),
            total_watch_time: Math.round(parseInt(d.total_watch_time || 0) / 60),
          })));
        }

        if (popularRes.success) {
          setPopularContents(popularRes.data);
        }
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange, spaceId]);

  const handleExport = (type: 'sessions' | 'logs') => {
    const endDate = new Date();
    const startDate = subDays(endDate, parseInt(dateRange));
    const url = type === 'sessions'
      ? statsApi.exportSessions({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'csv',
        })
      : statsApi.exportLogs({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'csv',
        });
    window.open(url, '_blank');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="통계 분석" />

        <main className="p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <Select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-40"
                    >
                      <option value="7">최근 7일</option>
                      <option value="14">최근 14일</option>
                      <option value="30">최근 30일</option>
                      <option value="90">최근 90일</option>
                    </Select>
                  </div>

                  <Select
                    value={spaceId}
                    onChange={(e) => setSpaceId(e.target.value)}
                    className="w-48"
                  >
                    <option value="">전체 공간</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport('sessions')}>
                    <Download className="w-4 h-4 mr-2" />
                    세션 데이터
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('logs')}>
                    <Download className="w-4 h-4 mr-2" />
                    로그 데이터
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[
              { label: '총 세션', value: dailyStats.reduce((sum, d) => sum + d.unique_sessions, 0) },
              { label: '총 이벤트', value: dailyStats.reduce((sum, d) => sum + d.total_events, 0) },
              { label: '총 시청 시간', value: `${dailyStats.reduce((sum, d) => sum + d.total_watch_time, 0)}분` },
              { label: '일평균 세션', value: Math.round(dailyStats.reduce((sum, d) => sum + d.unique_sessions, 0) / (dailyStats.length || 1)) },
            ].map((stat, index) => (
              <Card key={index}>
                <CardContent className="text-center py-6">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>일별 세션 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="unique_sessions"
                        name="세션 수"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ fill: '#0ea5e9' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>일별 시청 시간 (분)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar
                        dataKey="total_watch_time"
                        name="시청 시간"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Contents Table */}
          <Card>
            <CardHeader>
              <CardTitle>인기 콘텐츠 순위</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">순위</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">콘텐츠명</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">조회수</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">총 시청시간</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">평균 시청시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularContents.map((content, index) => (
                      <tr key={content.content_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{content.content_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {formatNumber(parseInt(content.view_count))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {formatDuration(parseInt(content.total_watch_time || 0))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                          {formatDuration(Math.round(parseFloat(content.avg_watch_time || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
