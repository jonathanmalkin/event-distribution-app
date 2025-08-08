-- Clean up venues and organizers from local app
-- Keep events but remove venue/organizer references

-- First, remove organizer references from events
UPDATE events SET organizer_id = NULL WHERE organizer_id IS NOT NULL;

-- Delete venue mappings
DELETE FROM wordpress_venues;

-- Delete organizers
DELETE FROM organizers;

-- Delete venues
DELETE FROM venues;

-- Reset sequences
ALTER SEQUENCE venues_id_seq RESTART WITH 1;
ALTER SEQUENCE organizers_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 'Venues count: ' || COUNT(*) AS cleanup_status FROM venues
UNION ALL
SELECT 'Organizers count: ' || COUNT(*) FROM organizers
UNION ALL
SELECT 'WordPress venues count: ' || COUNT(*) FROM wordpress_venues
UNION ALL
SELECT 'Events without organizer: ' || COUNT(*) FROM events WHERE organizer_id IS NULL;