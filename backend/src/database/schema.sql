-- Create database
CREATE DATABASE event_distribution;

-- Connect to the database
\c event_distribution;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    theme VARCHAR(255),
    description TEXT,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    general_location VARCHAR(255) NOT NULL,
    specific_location TEXT NOT NULL,
    banner_image_url TEXT,
    ai_generated_theme VARCHAR(255),
    ai_generated_description TEXT,
    manual_theme_override VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_events_date_time ON events(date_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_distributions_event_id ON event_distributions(event_id);
CREATE INDEX idx_event_distributions_platform ON event_distributions(platform);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_email ON event_rsvps(email);

-- Update trigger for events table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_configs_updated_at 
    BEFORE UPDATE ON platform_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();