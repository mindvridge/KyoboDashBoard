/**
 * 한국 시간(KST, UTC+9) 유틸리티
 */

const KOREA_TIMEZONE = 'Asia/Seoul';
const KOREA_OFFSET_HOURS = 9;

/**
 * 현재 한국 시간을 반환합니다.
 */
export function getKoreaTime(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (KOREA_OFFSET_HOURS * 3600000));
}

/**
 * 한국 시간 기준 오늘의 시작과 끝 시간을 반환합니다.
 */
export function getKoreaTodayRange(): { start: Date; end: Date } {
  const koreaToday = getKoreaTime();
  koreaToday.setHours(0, 0, 0, 0);

  const koreaTomorrow = new Date(koreaToday);
  koreaTomorrow.setDate(koreaTomorrow.getDate() + 1);

  return { start: koreaToday, end: koreaTomorrow };
}

/**
 * 한국 시간 기준으로 날짜 범위를 계산합니다.
 * @param daysAgo 며칠 전부터 시작할지 (기본값: 7)
 */
export function getKoreaDateRange(daysAgo: number = 7): { start: Date; end: Date } {
  const koreaEnd = getKoreaTime();

  const koreaStart = new Date(koreaEnd);
  koreaStart.setDate(koreaStart.getDate() - daysAgo);
  koreaStart.setHours(0, 0, 0, 0);

  return { start: koreaStart, end: koreaEnd };
}

/**
 * Date 객체를 한국 시간 문자열로 포맷팅합니다.
 * @param date 변환할 Date 객체
 * @param format 포맷 타입 ('datetime' | 'date' | 'time' | 'iso')
 */
export function formatKoreaTime(date: Date, format: 'datetime' | 'date' | 'time' | 'iso' = 'datetime'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: KOREA_TIMEZONE,
  };

  switch (format) {
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'iso':
      return formatKoreaISO(date);
  }

  return new Intl.DateTimeFormat('ko-KR', options).format(date);
}

/**
 * Date 객체를 한국 시간 기준 ISO 형식 문자열로 반환합니다.
 * 예: "2024-12-05T14:30:00+09:00"
 */
export function formatKoreaISO(date: Date): string {
  const koreaDate = new Date(date.toLocaleString('en-US', { timeZone: KOREA_TIMEZONE }));

  const year = koreaDate.getFullYear();
  const month = String(koreaDate.getMonth() + 1).padStart(2, '0');
  const day = String(koreaDate.getDate()).padStart(2, '0');
  const hours = String(koreaDate.getHours()).padStart(2, '0');
  const minutes = String(koreaDate.getMinutes()).padStart(2, '0');
  const seconds = String(koreaDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

/**
 * 한국 시간 기준으로 날짜 문자열을 파싱합니다.
 * @param dateString YYYY-MM-DD 형식의 문자열
 */
export function parseKoreaDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  // UTC로 변환 후 한국 시간 오프셋 적용
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc - (KOREA_OFFSET_HOURS * 3600000));
}

export default {
  getKoreaTime,
  getKoreaTodayRange,
  getKoreaDateRange,
  formatKoreaTime,
  formatKoreaISO,
  parseKoreaDate,
};
