'use client';

import { useState } from 'react';
import { RefreshCw, LogOut, User, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTestDeviceFilter } from '@/contexts/TestDeviceFilterContext';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({ title, onRefresh, isLoading }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, logout } = useAuth();
  const { showTestDevices, setShowTestDevices } = useTestDeviceFilter();

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
          {/* Test Device Filter */}
          <label className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
            <input
              type="checkbox"
              checked={showTestDevices}
              onChange={(e) => setShowTestDevices(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
            />
            <FlaskConical className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">테스트 기기 포함</span>
          </label>

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
