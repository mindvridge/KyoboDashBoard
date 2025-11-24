import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(dateString: string, formatStr = 'yyyy-MM-dd HH:mm:ss'): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr, { locale: ko });
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  } catch {
    return dateString;
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}분 ${remainingSeconds}초`
      : `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes > 0) {
    return `${hours}시간 ${remainingMinutes}분`;
  }

  return `${hours}시간`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'SELECT': '콘텐츠 선택',
    'WATCH_START': '시청 시작',
    'WATCH_END': '시청 완료',
    'WATCH_PAUSE': '일시 정지',
    'WATCH_RESUME': '재생 재개',
    'CONTENT_SWITCH': '콘텐츠 전환',
    'LOBBY_ENTER': '로비 입장',
    'LOBBY_EXIT': '로비 퇴장',
  };
  return labels[actionType] || actionType;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    'info': 'blue',
    'warning': 'yellow',
    'error': 'red',
    'critical': 'purple',
  };
  return colors[severity] || 'gray';
}
