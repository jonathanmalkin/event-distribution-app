-- Test script to clean database and verify fresh import capability
-- Step 1: Clean all data in proper order (respecting foreign keys)

-- Delete events first (they reference venues and organizers)
DELETE FROM events;

-- Delete venue mappings
DELETE FROM wordpress_venues;

-- Delete organizers
DELETE FROM organizers;

-- Delete venues (events are already deleted)
DELETE FROM venues;

-- Reset sequences to start fresh
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE venues_id_seq RESTART WITH 1;  
ALTER SEQUENCE organizers_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 'Events count: ' || COUNT(*) AS result FROM events
UNION ALL
SELECT 'Venues count: ' || COUNT(*) FROM venues  
UNION ALL
SELECT 'Organizers count: ' || COUNT(*) FROM organizers
UNION ALL
SELECT 'WordPress venues count: ' || COUNT(*) FROM wordpress_venues;