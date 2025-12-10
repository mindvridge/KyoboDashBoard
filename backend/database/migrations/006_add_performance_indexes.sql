-- Performance optimization indexes
-- Migration: 006_add_performance_indexes.sql

-- 1. content_logs 복합 인덱스: findLastWatchStart 쿼리 최적화
-- session_id + content_id + action_type 조합으로 빠른 검색
CREATE INDEX IF NOT EXISTS idx_content_logs_session_content_action
ON content_logs(session_id, content_id, action_type);

-- 2. content_logs 복합 인덱스: 시간 범위 내 action_type 검색 최적화
-- getPopularContents, getHourlyWatchDistribution 등에서 사용
CREATE INDEX IF NOT EXISTS idx_content_logs_action_timestamp
ON content_logs(action_type, timestamp);

-- 3. content_logs 복합 인덱스: findLastWatchStart 폴백 쿼리 최적화
-- content_id + action_type + timestamp 조합
CREATE INDEX IF NOT EXISTS idx_content_logs_content_action_timestamp
ON content_logs(content_id, action_type, timestamp DESC);

-- 4. sessions 복합 인덱스: device_id로 활성 세션 검색 최적화
CREATE INDEX IF NOT EXISTS idx_sessions_device_active
ON sessions(device_id, is_active) WHERE is_active = true;

-- 5. content_logs: 날짜별 통계 쿼리 최적화 (캘린더, 일별 통계)
CREATE INDEX IF NOT EXISTS idx_content_logs_timestamp_action
ON content_logs(timestamp, action_type);

-- 6. sessions: 시간 범위 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_sessions_start_end_time
ON sessions(start_time, end_time);
