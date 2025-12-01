'use client';

import { useState } from 'react';
import { Bell, RefreshCw, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title: string;
  alertCount?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ title, alertCount = 0, onRefresh, isLoading }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, logout } = useAuth();

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>

          {/* Alerts */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Connection Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">실시간 연결됨</span>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-50 rounded-lg">
              <User className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                {user?.name || user?.username || '관리자'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <LogOut className="w-4 h-4 mr-1" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
