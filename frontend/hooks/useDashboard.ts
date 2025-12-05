'use client';

import { useState, useEffect, useCallback } from 'react';
import { statsApi, sessionsApi } from '@/utils/api';
import { DashboardStats, Session, Alert } from '@/types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, sessionsRes, alertsRes] = await Promise.all([
        statsApi.getDashboard(),
        sessionsApi.getActive(),
        statsApi.getAlerts(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (sessionsRes.success) setActiveSessions(sessionsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
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
    fetchData();
  }, [fetchData]);

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
