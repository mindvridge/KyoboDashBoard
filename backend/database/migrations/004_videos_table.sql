-- Videos table for content management
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index SERIAL,
    filename VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url VARCHAR(1000),
    thumbnail_url VARCHAR(1000),
    duration INTEGER,
    file_size BIGINT,
    is_preinstalled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for videos table
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);
CREATE INDEX IF NOT EXISTS idx_videos_sort_order ON videos(sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_index ON videos(index);

-- Apply updated_at trigger to videos
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
