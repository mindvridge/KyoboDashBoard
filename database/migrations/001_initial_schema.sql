-- VR Log Dashboard Database Schema
-- Initial Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Spaces table: Physical locations where VR devices are deployed
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for spaces
CREATE INDEX IF NOT EXISTS idx_spaces_name ON spaces(name);

-- Devices table: VR device information
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL UNIQUE,
    mac_address VARCHAR(50) NOT NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    device_name VARCHAR(255),
    model VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for devices
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_space_id ON devices(space_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

-- Sessions table: User session information
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- Duration in seconds
    lobby_time INTEGER, -- Lobby stay time in seconds
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Content logs table: Content viewing and interaction logs
CREATE TABLE IF NOT EXISTS content_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    content_id VARCHAR(255) NOT NULL,
    content_name VARCHAR(500) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER, -- Duration in seconds (for watch events)
    metadata JSONB
);

-- Create indexes for content_logs
CREATE INDEX IF NOT EXISTS idx_content_logs_session_id ON content_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_content_logs_content_id ON content_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_content_logs_action_type ON content_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_content_logs_timestamp ON content_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_content_logs_content_id_timestamp ON content_logs(content_id, timestamp);

-- Error logs table: Device error logging
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_device_id ON error_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_session_id ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);

-- Alerts table: System alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create default space
INSERT INTO spaces (id, name, location, description)
VALUES (
    uuid_generate_v4(),
    'Default Space',
    'Default Location',
    'Default space for devices without assigned location'
) ON CONFLICT DO NOTHING;
