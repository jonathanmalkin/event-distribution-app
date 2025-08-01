-- Add venues table for reusable venue storage
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    general_description VARCHAR(255), -- For public display
    parking_info TEXT,
    special_instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, street_address) -- Prevent exact duplicates
);

-- Update events table to use venue reference and separate general location
ALTER TABLE events 
ADD COLUMN venue_id INTEGER REFERENCES venues(id),
ADD COLUMN general_area VARCHAR(255); -- e.g., "Downtown Seattle", "Capitol Hill area"

-- For backward compatibility, keep existing location fields but rename them
ALTER TABLE events 
RENAME COLUMN general_location TO legacy_general_location,
RENAME COLUMN specific_location TO legacy_specific_location;

-- Add indexes for performance
CREATE INDEX idx_venues_city_state ON venues(city, state);
CREATE INDEX idx_venues_active ON venues(is_active);
CREATE INDEX idx_events_venue_id ON events(venue_id);

-- Update trigger for venues table
CREATE TRIGGER update_venues_updated_at 
    BEFORE UPDATE ON venues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample venues for testing
INSERT INTO venues (name, street_address, city, state, zip_code, general_description, parking_info, special_instructions) VALUES
('Victrola Coffee Roasters', '411 15th Ave E', 'Seattle', 'WA', '98112', 'Capitol Hill location with outdoor seating', 'Street parking available, 2-hour limit', 'Large tables in back area are best for groups'),
('Analog Coffee', '235 Summit Ave E', 'Seattle', 'WA', '98102', 'Cozy neighborhood spot on Capitol Hill', 'Limited street parking', 'Counter seating available, gets busy after 9am'),
('Café Ladro', '2205 Queen Anne Ave N', 'Seattle', 'WA', '98109', 'Queen Anne location with lots of seating', 'Parking garage nearby', 'Upper level has more private seating'),
('Cherry Street Coffee House', '808 3rd Ave', 'Seattle', 'WA', '98104', 'Downtown location, business district', 'Paid parking garage adjacent', 'Ground floor, wheelchair accessible');