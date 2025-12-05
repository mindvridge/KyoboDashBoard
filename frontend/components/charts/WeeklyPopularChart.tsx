'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { statsApi } from '@/utils/api';
import { Trophy } from 'lucide-react';

interface WeeklyPopularChartProps {
  title?: string;
}

interface PopularContent {
  content_name: string;
  view_count: number;
  total_watch_time: number;
}

const COLORS = ['#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4'];

export function WeeklyPopularChart({ title = '주간 인기 영상' }: WeeklyPopularChartProps) {
  const [data, setData] = useState<PopularContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyPopular = async () => {
      try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const result = await statsApi.getPopular({
          startDate: weekAgo.toISOString(),
          endDate: now.toISOString(),
          limit: 6,
        });

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch weekly popular:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyPopular();
    const interval = setInterval(fetchWeeklyPopular, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const chartData = data.slice(0, 6).map((item) => ({
    name: item.content_name.length > 12
      ? item.content_name.substring(0, 12) + '...'
      : item.content_name,
    fullName: item.content_name,
    views: item.view_count,
    watchTime: Math.round(item.total_watch_time / 60),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-gray-500">이번 주 시청 데이터가 없습니다</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number, name: string) => [
                  name === 'views' ? `${value}회` : `${value}분`,
                  name === 'views' ? '조회수' : '시청시간',
                ]}
                labelFormatter={(label: string, payload: any[]) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
              />
              <Bar dataKey="views" name="views" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
