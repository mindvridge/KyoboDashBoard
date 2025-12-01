'use client';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActiveSessionList } from '@/components/dashboard/ActiveSessionList';
import { RecentLogs } from '@/components/dashboard/RecentLogs';
import { SessionChart } from '@/components/charts/SessionChart';
import { PopularContentChart } from '@/components/charts/PopularContentChart';
import { SpaceStatsChart } from '@/components/charts/SpaceStatsChart';
import { useDashboard } from '@/hooks/useDashboard';
import { useSocket } from '@/hooks/useSocket';
import { formatDuration, formatNumber } from '@/utils/format';
import { Users, Clock, PlayCircle, MonitorPlay } from 'lucide-react';

export default function DashboardPage() {
  const { stats, activeSessions, alerts, isLoading, error, refresh, handleRealtimeEvent } = useDashboard();

  useSocket({
    onEvent: handleRealtimeEvent,
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header
          title="실시간 대시보드"
          alertCount={alerts.filter(a => !a.resolved).length}
          onRefresh={refresh}
          isLoading={isLoading}
        />

        <main className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="활성 세션"
              value={formatNumber(stats?.active_sessions || 0)}
              subtitle="현재 진행 중"
              icon={Users}
              color="green"
            />
            <StatCard
              title="오늘 총 세션"
              value={formatNumber(stats?.total_sessions_today || 0)}
              subtitle="00:00부터 현재까지"
              icon={MonitorPlay}
              color="blue"
            />
            <StatCard
              title="총 시청 시간"
              value={formatDuration(stats?.total_watch_time_today || 0)}
              subtitle="오늘 누적"
              icon={Clock}
              color="purple"
            />
            <StatCard
              title="인기 콘텐츠"
              value={stats?.popular_contents?.[0]?.content_name || '-'}
              subtitle={`${formatNumber(stats?.popular_contents?.[0]?.view_count || 0)}회 시청`}
              icon={PlayCircle}
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SessionChart data={stats?.hourly_sessions || []} />
            <PopularContentChart data={stats?.popular_contents || []} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ActiveSessionList sessions={activeSessions} isLoading={isLoading} />
            <RecentLogs />
            <SpaceStatsChart data={stats?.space_stats || []} />
          </div>
        </main>
      </div>
    </div>
  );
}
