-- Add admin_sessions table for admin authentication
-- This allows admins to stay logged in for 24 hours

CREATE TABLE IF NOT EXISTS admin_sessions (
    browser_id VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanup of expired sessions
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Optional: Add a cleanup function to remove expired sessions
-- Run this periodically or on admin login
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS VOID AS $$
BEGIN
    DELETE FROM admin_sessions
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
