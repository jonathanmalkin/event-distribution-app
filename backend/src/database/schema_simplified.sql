-- Simplified venues table (remove unnecessary fields)
ALTER TABLE venues 
DROP COLUMN IF EXISTS general_description,
DROP COLUMN IF EXISTS parking_info,
DROP COLUMN IF EXISTS special_instructions;

-- Remove general_area from events table since we'll derive it from venue
ALTER TABLE events 
DROP COLUMN IF EXISTS general_area;

-- Update sample venues to match simplified structure
DELETE FROM venues;

INSERT INTO venues (name, street_address, city, state, zip_code) VALUES
('Victrola Coffee Roasters', '411 15th Ave E', 'Seattle', 'WA', '98112'),
('Analog Coffee', '235 Summit Ave E', 'Seattle', 'WA', '98102'),
('Café Ladro', '2205 Queen Anne Ave N', 'Seattle', 'WA', '98109'),
('Cherry Street Coffee House', '808 3rd Ave', 'Seattle', 'WA', '98104'),
('Stumptown Coffee Roasters', '1026 SW Stark St', 'Portland', 'OR', '97205'),
('Blue Bottle Coffee', '56 Mint Plaza', 'San Francisco', 'CA', '94103');