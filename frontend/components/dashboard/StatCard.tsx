'use client';

import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorStyles = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    trend: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    trend: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    trend: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    trend: 'text-red-600',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div className={cn('rounded-xl p-6', styles.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={cn('text-sm font-medium', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs 어제</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
