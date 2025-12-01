-- Videos table: Video content management for Unity VR app
-- Migration 002

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index SERIAL UNIQUE,                              -- 고유 인덱스 (자동 증가)
    filename VARCHAR(500) NOT NULL,                   -- 비디오 파일이름
    title VARCHAR(500) NOT NULL,                      -- 비디오 타이틀
    description TEXT,                                  -- 비디오 설명
    file_url VARCHAR(1000),                           -- 파일 다운로드 URL (선택사항)
    thumbnail_url VARCHAR(1000),                      -- 썸네일 URL (선택사항)
    duration INTEGER,                                  -- 비디오 길이 (초)
    file_size BIGINT,                                  -- 파일 크기 (바이트)
    is_preinstalled BOOLEAN DEFAULT false,            -- 디바이스 사전 설치 여부
    is_active BOOLEAN DEFAULT true,                   -- 활성 상태
    sort_order INTEGER DEFAULT 0,                     -- 정렬 순서
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_index ON videos(index);
CREATE INDEX IF NOT EXISTS idx_videos_filename ON videos(filename);
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);
CREATE INDEX IF NOT EXISTS idx_videos_sort_order ON videos(sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

-- Apply updated_at trigger to videos table
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample videos (optional)
-- INSERT INTO videos (filename, title, description) VALUES
-- ('hangang_vr_tour.mp4', '한강 VR 투어', '서울 한강공원의 아름다운 풍경을 VR로 체험해보세요.'),
-- ('seoul_timelapse.mp4', '서울 타임랩스', '서울의 하루를 4K 타임랩스 영상으로 감상하세요.');
