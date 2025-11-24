'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SpaceStats } from '@/types';

interface SpaceStatsChartProps {
  data: SpaceStats[];
  title?: string;
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function SpaceStatsChart({ data, title = '공간별 이용 현황' }: SpaceStatsChartProps) {
  const chartData = data.map((item) => ({
    name: item.space_name,
    value: item.total_sessions,
    activeDevices: item.active_devices,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}개 세션 / ${props.payload.activeDevices}개 기기`,
                  props.payload.name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
