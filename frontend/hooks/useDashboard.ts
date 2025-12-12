'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { statsApi, sessionsApi } from '@/utils/api';
import { DashboardStats, Session, Alert } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTestDeviceFilter } from '@/contexts/TestDeviceFilterContext';
import { isTestDevice } from '@/constants/testDevices';

export function useDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showTestDevices } = useTestDeviceFilter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allActiveSessions, setAllActiveSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 테스트 기기 필터링된 활성 세션
  const activeSessions = useMemo(() => {
    if (showTestDevices) {
      return allActiveSessions;
    }
    return allActiveSessions.filter(session => !isTestDevice(session.device_id));
  }, [allActiveSessions, showTestDevices]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, sessionsRes, alertsRes] = await Promise.all([
        statsApi.getDashboard(),
        sessionsApi.getActive(),
        statsApi.getAlerts(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (sessionsRes.success) setAllActiveSessions(sessionsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
    } catch (err) {
      // 401 에러는 조용히 처리 (인증 만료)
      if (err instanceof Error && err.message.includes('401')) {
        console.warn('Authentication expired for dashboard');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRealtimeEvent = useCallback((event: { type: string; data: unknown }) => {
    switch (event.type) {
      case 'STATS_UPDATE':
        setStats(event.data as DashboardStats);
        break;
      case 'SESSION_START':
        fetchData();
        break;
      case 'SESSION_END':
        fetchData();
        break;
      case 'ALERT':
        setAlerts(prev => [event.data as Alert, ...prev]);
        break;
    }
  }, [fetchData]);

  useEffect(() => {
    // 인증 확인 전에는 API 호출하지 않음
    if (authLoading || !isAuthenticated) {
      return;
    }
    fetchData();
  }, [fetchData, authLoading, isAuthenticated]);

  return {
    stats,
    activeSessions,
    alerts,
    isLoading,
    error,
    refresh,
    handleRealtimeEvent,
  };
}
