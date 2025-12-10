'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { statsApi } from '@/utils/api';
import { ChevronLeft, ChevronRight, Calendar, Monitor, Clock, Video, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface DayStat {
  date: string;
  device_count: number;
  content_count: number;
  total_watch_time: number;
}

interface ContentStat {
  content_id: string;
  content_name: string;
  action_type: string;
  timestamp: string;
  duration: number;
}

interface DeviceContent {
  content_id: string;
  content_name: string;
  view_count: number;
  total_watch_time: number;
}

interface DeviceViewing {
  device_id: string;
  device_info: string;
  contents: DeviceContent[];
}

interface DailyDetail {
  content_stats: ContentStat[];
  device_viewings: DeviceViewing[];
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ViewingCalendar() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<DayStat[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayString());
  const [dailyDetail, setDailyDetail] = useState<DailyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Fetch monthly data
  useEffect(() => {
    // 인증 확인 전에는 API 호출하지 않음
    if (authLoading || !isAuthenticated) {
      return;
    }

    const fetchMonthly = async () => {
      setIsLoading(true);
      try {
        const result = await statsApi.getCalendarMonthly({ year, month });
        if (result.success) {
          setMonthlyData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch monthly data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonthly();
  }, [year, month, authLoading, isAuthenticated]);

  // Fetch daily detail when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setDailyDetail(null);
      return;
    }

    // 인증 확인 전에는 API 호출하지 않음
    if (authLoading || !isAuthenticated) {
      return;
    }

    const fetchDaily = async () => {
      setIsDetailLoading(true);
      try {
        const result = await statsApi.getCalendarDaily(selectedDate);
        if (result.success) {
          setDailyDetail({
            content_stats: result.content_stats,
            device_viewings: result.device_viewings,
          });
        }
      } catch (error) {
        console.error('Failed to fetch daily data:', error);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchDaily();
  }, [selectedDate, authLoading, isAuthenticated]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getDayStat = (day: number): DayStat | undefined => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return monthlyData.find(d => d.date.startsWith(dateStr));
  };

  const getHeatColor = (watchTime: number): string => {
    if (watchTime === 0) return 'bg-gray-100';
    if (watchTime < 300) return 'bg-green-100'; // < 5 min
    if (watchTime < 1200) return 'bg-green-200'; // < 20 min
    if (watchTime < 3600) return 'bg-green-300'; // < 1 hour
    if (watchTime < 7200) return 'bg-green-400'; // < 2 hours
    return 'bg-green-500';
  };

  const formatWatchTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${mins}분`;
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const days = generateCalendarDays();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              일별 시청 현황
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                {year}년 {month}월
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center text-xs font-medium py-2 ${
                      i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-12" />;
                  }

                  const stat = getDayStat(day);
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = new Date().toISOString().startsWith(dateStr);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`h-12 rounded-lg flex flex-col items-center justify-center transition-all ${
                        stat ? getHeatColor(stat.total_watch_time) : 'bg-gray-50'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${
                        isToday ? 'ring-2 ring-amber-400' : ''
                      } hover:opacity-80`}
                    >
                      <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>{day}</span>
                      {stat && stat.total_watch_time > 0 && (
                        <span className="text-[10px] text-gray-600">
                          {formatWatchTime(stat.total_watch_time)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                <span>적음</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded bg-gray-100" />
                  <div className="w-4 h-4 rounded bg-green-100" />
                  <div className="w-4 h-4 rounded bg-green-200" />
                  <div className="w-4 h-4 rounded bg-green-300" />
                  <div className="w-4 h-4 rounded bg-green-400" />
                  <div className="w-4 h-4 rounded bg-green-500" />
                </div>
                <span>많음</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Daily Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-purple-500" />
            {selectedDate
              ? format(new Date(selectedDate), 'yyyy년 M월 d일 (EEEE)', { locale: ko })
              : '날짜를 선택하세요'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>캘린더에서 날짜를 클릭하면</p>
                <p>상세 시청 정보를 확인할 수 있습니다</p>
              </div>
            </div>
          ) : isDetailLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : dailyDetail ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Content Stats */}
              {dailyDetail.content_stats.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    콘텐츠별 시청 시간
                  </h4>
                  <div className="space-y-2">
                    {dailyDetail.content_stats.map((content, index) => {
                      const time = new Date(content.timestamp);
                      const timeStr = format(time, 'a h시 mm분', { locale: ko });
                      const isWatchEnd = content.action_type === 'WATCH_END';
                      const cappedDuration = Math.min(content.duration || 0, 1200);

                      return (
                        <div
                          key={`${content.content_id}-${index}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {isWatchEnd ? (
                              <Clock className="w-4 h-4 text-green-500" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-sm truncate max-w-[120px]">{content.content_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">{timeStr}</span>
                            {isWatchEnd ? (
                              <span className="text-green-600 font-medium">
                                ({formatWatchTime(cappedDuration)})
                              </span>
                            ) : (
                              <span className="text-blue-600">시작</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Device Viewings */}
              {dailyDetail.device_viewings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Monitor className="w-4 h-4" />
                    기기별 시청 내역
                  </h4>
                  <div className="space-y-3">
                    {dailyDetail.device_viewings.map((device) => (
                      <div key={device.device_id} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2 text-blue-600">
                          {device.device_info}
                        </div>
                        <div className="space-y-1">
                          {device.contents.map((content) => (
                            <div
                              key={content.content_id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="truncate max-w-[180px] text-gray-600">
                                {content.content_name}
                              </span>
                              <span className="text-green-600">
                                {formatWatchTime(content.total_watch_time)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dailyDetail.content_stats.length === 0 && dailyDetail.device_viewings.length === 0 && (
                <div className="flex items-center justify-center h-[200px] text-gray-400">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>이 날의 시청 기록이 없습니다</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
