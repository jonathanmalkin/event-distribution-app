-- Create database
CREATE DATABASE IF NOT EXISTS event_distribution;

-- Connect to the database
\c event_distribution;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS ai_generations CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS event_distributions CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS platform_configs CASCADE;

-- Create venues table (simplified)
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, street_address) -- Prevent exact duplicates
);

-- Create events table (simplified)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    theme VARCHAR(255),
    description TEXT,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    venue_id INTEGER NOT NULL REFERENCES venues(id),
    banner_image_url TEXT,
    ai_generated_theme VARCHAR(255),
    ai_generated_description TEXT,
    manual_theme_override VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Legacy fields for backward compatibility
    legacy_general_location VARCHAR(255),
    legacy_specific_location TEXT
);

-- Event distribution tracking
CREATE TABLE event_distributions (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('wordpress', 'facebook', 'instagram', 'eventbrite', 'meetup', 'fetlife')),
    platform_event_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSVP tracking
CREATE TABLE event_rsvps (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    newsletter_signup BOOLEAN DEFAULT false,
    location_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, email)
);

-- Platform configurations (for storing API keys, settings, etc.)
CREATE TABLE platform_configs (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI generation history (for tracking costs and usage)
CREATE TABLE ai_generations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('theme', 'description', 'image')),
    prompt_used TEXT,
    result TEXT,
    tokens_used INTEGER,
    cost_cents INTEGER,
    model_used VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_venues_city_state ON venues(city, state);
CREATE INDEX idx_venues_active ON venues(is_active);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_date_time ON events(date_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_distributions_event_id ON event_distributions(event_id);
CREATE INDEX idx_event_distributions_platform ON event_distributions(platform);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_email ON event_rsvps(email);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers
CREATE TRIGGER update_venues_updated_at 
    BEFORE UPDATE ON venues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_configs_updated_at 
    BEFORE UPDATE ON platform_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample venues for testing
INSERT INTO venues (name, street_address, city, state, zip_code) VALUES
('Victrola Coffee Roasters', '411 15th Ave E', 'Seattle', 'WA', '98112'),
('Analog Coffee', '235 Summit Ave E', 'Seattle', 'WA', '98102'),
('Café Ladro', '2205 Queen Anne Ave N', 'Seattle', 'WA', '98109'),
('Cherry Street Coffee House', '808 3rd Ave', 'Seattle', 'WA', '98104'),
('Stumptown Coffee Roasters', '1026 SW Stark St', 'Portland', 'OR', '97205'),
('Blue Bottle Coffee', '56 Mint Plaza', 'San Francisco', 'CA', '94103'),
('Intelligentsia Coffee', '1331 W Sunset Blvd', 'Los Angeles', 'CA', '90026'),
('Counter Culture Coffee', '1200 Hillsborough St', 'Raleigh', 'NC', '27605');

-- Insert a test event for verification
INSERT INTO events (date_time, venue_id, theme, description, status) VALUES
(NOW() + INTERVAL '7 days', 1, 'Test Event', 'This is a test event to verify the system is working.', 'draft');