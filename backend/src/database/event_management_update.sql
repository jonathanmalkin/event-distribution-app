-- Event Management Schema Updates
-- Add unique constraint for event_distributions to prevent duplicates

-- Add unique constraint on event_id + platform combination
ALTER TABLE event_distributions 
ADD CONSTRAINT unique_event_platform 
UNIQUE (event_id, platform);

-- Add indexes for better performance on event management queries
CREATE INDEX IF NOT EXISTS idx_event_distributions_status ON event_distributions(status);
CREATE INDEX IF NOT EXISTS idx_event_distributions_posted_at ON event_distributions(posted_at);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

-- Update the event_distributions table to include more detailed platform data
ALTER TABLE event_distributions 
ADD COLUMN IF NOT EXISTS platform_url TEXT,
ADD COLUMN IF NOT EXISTS platform_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add trigger to update event's updated_at when distributions change
CREATE OR REPLACE FUNCTION update_event_on_distribution_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events SET updated_at = NOW() WHERE id = NEW.event_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_on_distribution_insert
    AFTER INSERT ON event_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_event_on_distribution_change();

CREATE TRIGGER update_event_on_distribution_update
    AFTER UPDATE ON event_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_event_on_distribution_change();