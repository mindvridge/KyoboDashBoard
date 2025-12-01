-- Users Migration
-- Admin user authentication system

-- Users table: Admin users for dashboard access
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Apply updated_at trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create default admin user (password: admin123)
-- bcrypt hash for 'admin123' with 10 rounds
INSERT INTO users (id, email, username, password_hash, name, role)
VALUES (
    uuid_generate_v4(),
    'admin@kyobo.com',
    'admin',
    '$2b$10$rQZ5V.K3ej7qE8v4.RQoNOy8n5jH6tN8L5Q0Kv7G6Hk4YwV3z9mWC',
    '관리자',
    'admin'
) ON CONFLICT (email) DO NOTHING;
