-- Add organizers table for imported organizer data
CREATE TABLE IF NOT EXISTS organizers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    wordpress_organizer_id INTEGER,
    wordpress_site_url VARCHAR(255),
    imported_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wordpress_organizer_id, wordpress_site_url)
);

-- Add organizer_id to events table for default organizer assignment
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id INTEGER REFERENCES organizers(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizers_default ON organizers(is_default);
CREATE INDEX IF NOT EXISTS idx_organizers_wordpress_id ON organizers(wordpress_organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);

-- Add trigger to ensure only one default organizer
CREATE OR REPLACE FUNCTION ensure_single_default_organizer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE organizers SET is_default = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_organizer ON organizers;
CREATE TRIGGER trigger_single_default_organizer
    AFTER INSERT OR UPDATE ON organizers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_organizer();

-- Update trigger for organizers table
CREATE TRIGGER update_organizers_updated_at 
    BEFORE UPDATE ON organizers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();