-- WordPress Import Feature Database Schema
-- Add WordPress integration columns and tables for import functionality

-- Add WordPress integration columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_event_id INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_url VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_modified_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced';

-- WordPress import tracking
CREATE TABLE IF NOT EXISTS wordpress_imports (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  options JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- WordPress venues mapping
CREATE TABLE IF NOT EXISTS wordpress_venues (
  id SERIAL PRIMARY KEY,
  local_venue_id INTEGER REFERENCES venues(id),
  wordpress_venue_id INTEGER NOT NULL,
  wordpress_name VARCHAR(255),
  wordpress_address VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wordpress_venue_id)
);

-- Import conflicts tracking
CREATE TABLE IF NOT EXISTS import_conflicts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  wordpress_id INTEGER NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  local_value JSONB,
  wordpress_value JSONB,
  strategy VARCHAR(20) DEFAULT 'manual',
  resolution VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(100)
);

-- Sync history
CREATE TABLE IF NOT EXISTS sync_history (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled', 'import'
  events_processed INTEGER DEFAULT 0,
  events_imported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  triggered_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_wordpress_id ON events(wordpress_event_id);
CREATE INDEX IF NOT EXISTS idx_events_last_synced ON events(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_events_sync_status ON events(sync_status);
CREATE INDEX IF NOT EXISTS idx_wordpress_imports_job_id ON wordpress_imports(job_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_imports_status ON wordpress_imports(status);
CREATE INDEX IF NOT EXISTS idx_import_conflicts_resolution ON import_conflicts(resolution);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON sync_history(created_at);

-- Add comments for documentation
COMMENT ON TABLE wordpress_imports IS 'Tracks WordPress import jobs and their progress';
COMMENT ON TABLE wordpress_venues IS 'Maps WordPress venue IDs to local venue IDs';
COMMENT ON TABLE import_conflicts IS 'Tracks conflicts between WordPress and local event data';
COMMENT ON TABLE sync_history IS 'Historical record of all sync operations';

COMMENT ON COLUMN events.wordpress_event_id IS 'ID of corresponding event in WordPress';
COMMENT ON COLUMN events.wordpress_url IS 'Direct URL to WordPress event page';
COMMENT ON COLUMN events.imported_at IS 'When this event was first imported from WordPress';
COMMENT ON COLUMN events.last_synced_at IS 'Last successful sync timestamp';
COMMENT ON COLUMN events.sync_status IS 'Current sync status: synced, conflicts, error';