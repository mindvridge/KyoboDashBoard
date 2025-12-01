// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  count?: number;
}

// Domain Types
export interface Space {
  id: string;
  name: string;
  location: string;
  description?: string;
  device_count?: number;
  active_sessions?: number;
  created_at: string;
}

export interface Device {
  id: string;
  device_id: string;
  mac_address: string;
  space_id: string;
  space_name?: string;
  device_name?: string;
  model?: string;
  last_seen: string;
  is_active: boolean;
}

export interface Session {
  id: string;
  device_id: string;
  device_info?: string;
  space_name?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  lobby_time?: number;
  is_active: boolean;
  current_duration?: number;
  logs?: ContentLog[];
}

export interface ContentLog {
  id: string;
  session_id: string;
  device_info?: string;
  space_name?: string;
  content_id: string;
  content_name: string;
  action_type: string;
  timestamp: string;
  duration?: number;
}

export interface DashboardStats {
  active_sessions: number;
  total_sessions_today: number;
  total_watch_time_today: number;
  popular_contents: PopularContent[];
  space_stats: SpaceStats[];
  hourly_sessions: HourlySession[];
}

export interface PopularContent {
  content_id: string;
  content_name: string;
  view_count: number;
  total_watch_time: number;
}

export interface SpaceStats {
  space_id: string;
  space_name: string;
  active_devices: number;
  total_sessions: number;
  avg_session_duration: number;
}

export interface HourlySession {
  hour: number;
  session_count: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  device_id?: string;
  session_id?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export interface RealtimeEvent {
  type: string;
  data: unknown;
  timestamp: string;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

// Filter Types
export interface DateFilter {
  startDate: Date;
  endDate: Date;
}

export interface LogFilter extends DateFilter {
  spaceId?: string;
  deviceId?: string;
  contentId?: string;
  actionType?: string;
}

// Video Types
export interface Video {
  id: string;
  index: number;
  filename: string;
  title: string;
  description?: string;
  file_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VideoCreateRequest {
  filename: string;
  title: string;
  description?: string;
  file_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  sort_order?: number;
}

export interface VideoUpdateRequest {
  filename?: string;
  title?: string;
  description?: string;
  file_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  is_active?: boolean;
  sort_order?: number;
}
