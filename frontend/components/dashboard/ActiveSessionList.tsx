'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Session } from '@/types';
import { formatDuration, formatRelativeTime } from '@/utils/format';
import { Monitor, Clock, MapPin } from 'lucide-react';

interface ActiveSessionListProps {
  sessions: Session[];
  isLoading?: boolean;
}

export function ActiveSessionList({ sessions, isLoading }: ActiveSessionListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>활성 세션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <span>활성 세션</span>
          <Badge variant="success" className="ml-2">
            {sessions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            현재 활성 세션이 없습니다
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.device_info || '알 수 없는 기기'}
                    </p>
                    <Badge variant="success">진행 중</Badge>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {session.space_name || '알 수 없는 위치'}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {session.current_duration
                        ? formatDuration(session.current_duration)
                        : formatRelativeTime(session.start_time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
