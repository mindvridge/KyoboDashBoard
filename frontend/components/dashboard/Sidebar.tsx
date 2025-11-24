'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  MapPin,
  Smartphone,
  Settings,
  Bell,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '통계 분석', href: '/analytics', icon: BarChart3 },
  { name: '로그 조회', href: '/logs', icon: FileText },
  { name: '공간 관리', href: '/spaces', icon: MapPin },
  { name: '기기 관리', href: '/devices', icon: Smartphone },
  { name: '알림', href: '/alerts', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gray-900 min-h-screen">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">VR</span>
          </div>
          <span className="text-white font-semibold text-lg">로그 대시보드</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5 mr-3" />
          설정
        </Link>
      </div>
    </div>
  );
}
