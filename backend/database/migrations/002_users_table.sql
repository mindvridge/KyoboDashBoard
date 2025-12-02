-- Users table for dashboard authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Default admin user (password: Admin123!)
-- Note: This is a bcrypt hash of 'Admin123!'
INSERT INTO users (email, username, password_hash, name, role)
VALUES (
    'admin@kyobo.com',
    'admin',
    '$2a$10$JwUziNHHNLFPEyPAILIXguixtu.X90QYqrwS3XbZaXEySilPYubci',
    '관리자',
    'admin'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
