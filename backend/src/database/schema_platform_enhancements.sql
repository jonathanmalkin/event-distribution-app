-- Platform Integration Enhancements
-- Run this after the main schema.sql to add enhanced platform tracking

-- Add enhanced platform tracking columns to event_distributions
ALTER TABLE event_distributions ADD COLUMN IF NOT EXISTS platform_url TEXT;
ALTER TABLE event_distributions ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';
ALTER TABLE event_distributions ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;

-- Add unique constraint for event_id + platform if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_distributions_event_id_platform_key'
    ) THEN
        ALTER TABLE event_distributions 
        ADD CONSTRAINT event_distributions_event_id_platform_key 
        UNIQUE (event_id, platform);
    END IF;
END $$;

-- Platform authentication tokens (encrypted storage)
CREATE TABLE IF NOT EXISTS platform_tokens (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    token_type VARCHAR(50) NOT NULL, -- 'access_token', 'refresh_token', 'api_key'
    encrypted_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, token_type)
);

-- Platform sync jobs tracking
CREATE TABLE IF NOT EXISTS platform_sync_jobs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('push', 'pull', 'bidirectional')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    sync_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced platform event details tracking
CREATE TABLE IF NOT EXISTS platform_event_details (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_event_id VARCHAR(255) NOT NULL,
    platform_url TEXT,
    title VARCHAR(500),
    description TEXT,
    platform_created_at TIMESTAMP WITH TIME ZONE,
    platform_updated_at TIMESTAMP WITH TIME ZONE,
    metrics JSONB DEFAULT '{}', -- attendees, likes, shares, views, etc.
    raw_data JSONB DEFAULT '{}', -- full platform API response
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_tokens_platform ON platform_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_platform_sync_jobs_event_platform ON platform_sync_jobs(event_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_sync_jobs_status ON platform_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_platform_event_details_event_platform ON platform_event_details(event_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_event_details_platform_id ON platform_event_details(platform_event_id);

-- Update trigger for platform_tokens
CREATE TRIGGER update_platform_tokens_updated_at 
    BEFORE UPDATE ON platform_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for platform_event_details
CREATE TRIGGER update_platform_event_details_updated_at 
    BEFORE UPDATE ON platform_event_details 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development (optional)
-- INSERT INTO platform_tokens (platform, token_type, encrypted_token, expires_at)
-- VALUES ('facebook', 'access_token', 'encrypted_token_here', NOW() + INTERVAL '60 days');

-- Comments for documentation
COMMENT ON TABLE platform_tokens IS 'Encrypted storage for platform API tokens and credentials';
COMMENT ON TABLE platform_sync_jobs IS 'Tracking for platform synchronization operations';
COMMENT ON TABLE platform_event_details IS 'Enhanced event details retrieved from platforms';
COMMENT ON COLUMN platform_event_details.metrics IS 'Platform-specific metrics: attendees, likes, shares, views, etc.';
COMMENT ON COLUMN platform_event_details.raw_data IS 'Full API response data for debugging and analysis';