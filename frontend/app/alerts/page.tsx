'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { statsApi } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const response = await statsApi.getAlerts();
      if (response.success) {
        setAlerts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (alertId: string) => {
    try {
      await statsApi.resolveAlert(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const unresolvedAlerts = alerts.filter((a) => !a.resolved_at);
  const resolvedAlerts = alerts.filter((a) => a.resolved_at);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <Header title="알림 관리" />

        <main className="p-6 space-y-6">
          {/* Unresolved Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                미해결 알림 ({unresolvedAlerts.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : unresolvedAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  미해결 알림이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {unresolvedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{alert.message}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(alert.created_at, 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.id)}
                      >
                        해결
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolved Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                해결된 알림 ({resolvedAlerts.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resolvedAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  해결된 알림이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {resolvedAlerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">{alert.message}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(alert.resolved_at, 'MM-dd HH:mm')}
                      </span>
                    </div>
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
