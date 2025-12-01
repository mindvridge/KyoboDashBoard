// Core Types for VR Log Dashboard

export interface Space {
  id: string;
  name: string;
  location: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  device_id: string;
  mac_address: string;
  space_id: string;
  device_name?: string;
  model?: string;
  last_seen: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  device_id: string;
  start_time: Date;
  end_time?: Date;
  duration?: number; // in seconds
  lobby_time?: number; // lobby stay time in seconds
  is_active: boolean;
  created_at: Date;
}

export interface ContentLog {
  id: string;
  session_id: string;
  content_id: string;
  content_name: string;
  action_type: ContentActionType;
  timestamp: Date;
  duration?: number; // in seconds (for watch events)
  metadata?: Record<string, unknown>;
}

export type ContentActionType =
  | 'SELECT'
  | 'WATCH_START'
  | 'WATCH_END'
  | 'WATCH_PAUSE'
  | 'WATCH_RESUME'
  | 'CONTENT_SWITCH'
  | 'LOBBY_ENTER'
  | 'LOBBY_EXIT';

export interface ErrorLog {
  id: string;
  device_id: string;
  session_id?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  timestamp: Date;
}

// API Request/Response Types
export interface DeviceRegistrationRequest {
  device_id: string;
  mac_address: string;
  space_id?: string;
  device_name?: string;
  model?: string;
}

export interface DeviceRegistrationResponse {
  success: boolean;
  device: Device;
  token: string;
  is_new_device: boolean;
}

export interface SessionStartRequest {
  device_id: string;
}

export interface SessionStartResponse {
  success: boolean;
  session_id: string;
  start_time: Date;
}

export interface ContentSelectRequest {
  session_id: string;
  content_id: string;
  content_name: string;
  metadata?: Record<string, unknown>;
}

export interface ContentWatchRequest {
  session_id: string;
  content_id: string;
  content_name: string;
  action_type: 'WATCH_START' | 'WATCH_END' | 'WATCH_PAUSE' | 'WATCH_RESUME';
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionEndRequest {
  session_id: string;
  lobby_time?: number;
}

export interface SessionEndResponse {
  success: boolean;
  session_id: string;
  duration: number;
  content_count: number;
}

// Statistics Types
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

// JWT Payload
export interface JWTPayload {
  device_id: string;
  space_id: string;
  iat: number;
  exp: number;
}

// Real-time Event Types
export interface RealtimeEvent {
  type: RealtimeEventType;
  data: unknown;
  timestamp: Date;
}

export type RealtimeEventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'CONTENT_SELECT'
  | 'CONTENT_WATCH'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'STATS_UPDATE'
  | 'ALERT';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  device_id?: string;
  session_id?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

export type AlertType =
  | 'ABNORMAL_SESSION'
  | 'DEVICE_ERROR'
  | 'CONNECTION_LOST'
  | 'HIGH_ERROR_RATE';

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
  is_preinstalled: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface VideoCreateRequest {
  filename: string;
  title: string;
  description?: string;
  file_url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: number;
  is_preinstalled?: boolean;
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
  is_preinstalled?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface VideoListResponse {
  success: boolean;
  data: Video[];
  count: number;
}
