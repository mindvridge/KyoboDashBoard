'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { HourlySession } from '@/types';

interface SessionChartProps {
  data: HourlySession[];
  title?: string;
}

export function SessionChart({ data, title = '시간대별 세션 현황' }: SessionChartProps) {
  const chartData = data.map((item) => ({
    hour: `${item.hour}시`,
    sessions: item.session_count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hour"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => [`${value}개`, '세션']}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#colorSessions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
