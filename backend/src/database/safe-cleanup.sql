-- Safe Database Cleanup Procedures
-- Handles foreign key constraints properly and provides rollback capabilities

-- =============================================================================
-- SAFE CLEANUP: Events, Venues, and Organizers
-- =============================================================================

-- Function to safely delete all event data
CREATE OR REPLACE FUNCTION safe_cleanup_all_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
    events_count INTEGER;
    venues_count INTEGER;
    organizers_count INTEGER;
    distributions_count INTEGER;
BEGIN
    -- Get initial counts for reporting
    SELECT COUNT(*) INTO events_count FROM events;
    SELECT COUNT(*) INTO venues_count FROM venues;
    SELECT COUNT(*) INTO organizers_count FROM organizers;
    SELECT COUNT(*) INTO distributions_count FROM event_distributions;
    
    -- Step 1: Delete dependent data first
    DELETE FROM import_conflicts;
    DELETE FROM event_distributions;
    DELETE FROM event_rsvps;
    DELETE FROM wordpress_imports;
    DELETE FROM ai_generations WHERE event_id IS NOT NULL;
    
    -- Step 2: Delete events (removes foreign key references)
    DELETE FROM events;
    
    -- Step 3: Delete venue mappings
    DELETE FROM wordpress_venues;
    
    -- Step 4: Delete organizers and venues
    DELETE FROM organizers;
    DELETE FROM venues;
    
    -- Step 5: Reset sequences
    ALTER SEQUENCE events_id_seq RESTART WITH 1;
    ALTER SEQUENCE venues_id_seq RESTART WITH 1;
    ALTER SEQUENCE organizers_id_seq RESTART WITH 1;
    
    -- Return cleanup summary
    result := json_build_object(
        'success', true,
        'deleted', json_build_object(
            'events', events_count,
            'venues', venues_count,
            'organizers', organizers_count,
            'distributions', distributions_count
        ),
        'remaining', json_build_object(
            'events', (SELECT COUNT(*) FROM events),
            'venues', (SELECT COUNT(*) FROM venues),
            'organizers', (SELECT COUNT(*) FROM organizers)
        )
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    ROLLBACK;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'hint', 'Transaction rolled back - no changes made'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to safely delete just venues and organizers (keep events)
CREATE OR REPLACE FUNCTION safe_cleanup_venues_organizers()
RETURNS JSON AS $$
DECLARE
    result JSON;
    venues_count INTEGER;
    organizers_count INTEGER;
BEGIN
    -- Get initial counts
    SELECT COUNT(*) INTO venues_count FROM venues;
    SELECT COUNT(*) INTO organizers_count FROM organizers;
    
    -- Step 1: Remove foreign key references from events
    UPDATE events SET venue_id = NULL WHERE venue_id IS NOT NULL;
    UPDATE events SET organizer_id = NULL WHERE organizer_id IS NOT NULL;
    
    -- Step 2: Delete mappings and dependent data
    DELETE FROM wordpress_venues;
    
    -- Step 3: Delete venues and organizers
    DELETE FROM organizers;
    DELETE FROM venues;
    
    -- Step 4: Reset sequences
    ALTER SEQUENCE venues_id_seq RESTART WITH 1;
    ALTER SEQUENCE organizers_id_seq RESTART WITH 1;
    
    result := json_build_object(
        'success', true,
        'deleted', json_build_object(
            'venues', venues_count,
            'organizers', organizers_count
        ),
        'events_updated', (SELECT COUNT(*) FROM events WHERE venue_id IS NULL AND organizer_id IS NULL)
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'hint', 'Transaction rolled back - no changes made'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check foreign key dependencies before deletion
CREATE OR REPLACE FUNCTION check_dependencies()
RETURNS JSON AS $$
DECLARE
    result JSON;
    events_with_venues INTEGER;
    events_with_organizers INTEGER;
    distributions_count INTEGER;
    rsvps_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_with_venues FROM events WHERE venue_id IS NOT NULL;
    SELECT COUNT(*) INTO events_with_organizers FROM events WHERE organizer_id IS NOT NULL;
    SELECT COUNT(*) INTO distributions_count FROM event_distributions;
    SELECT COUNT(*) INTO rsvps_count FROM event_rsvps;
    
    result := json_build_object(
        'dependencies', json_build_object(
            'events_with_venues', events_with_venues,
            'events_with_organizers', events_with_organizers,
            'event_distributions', distributions_count,
            'event_rsvps', rsvps_count
        ),
        'safe_to_delete_venues', (events_with_venues = 0),
        'safe_to_delete_organizers', (events_with_organizers = 0),
        'recommendations', CASE 
            WHEN events_with_venues > 0 OR events_with_organizers > 0 THEN
                'Remove venue_id and organizer_id references from events before deletion'
            ELSE
                'Safe to proceed with deletion'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USAGE EXAMPLES:
-- =============================================================================

-- Check dependencies before cleanup:
-- SELECT check_dependencies();

-- Safe cleanup of venues and organizers only:
-- SELECT safe_cleanup_venues_organizers();

-- Complete data cleanup:
-- SELECT safe_cleanup_all_data();