import express from 'express';
import pool from '../config/database';
import PlatformManager from '../services/PlatformManager';

const router = express.Router();
const platformManager = new PlatformManager();

// Trigger distribution for an event
router.post('/publish/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { platforms } = req.body;

    // Get event details with venue information
    const eventQuery = `
      SELECT e.*, v.name as venue_name, v.street_address, v.city, v.state, v.zip_code
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = $1
    `;
    const eventResult = await pool.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventRow = eventResult.rows[0];
    const platformsToPublish = platforms || ['facebook', 'instagram', 'eventbrite'];

    // Prepare event data for platform manager
    const eventData = {
      id: parseInt(eventId),
      title: eventRow.theme, // Use theme as title since title field doesn't exist
      theme: eventRow.theme,
      description: eventRow.description,
      ai_generated_description: eventRow.ai_generated_description,
      date_time: eventRow.date_time,
      banner_image_url: eventRow.banner_image_url,
      venue: eventRow.venue_name ? {
        id: eventRow.venue_id,
        name: eventRow.venue_name,
        street_address: eventRow.street_address,
        city: eventRow.city,
        state: eventRow.state,
        zip_code: eventRow.zip_code
      } : undefined
    };

    // Initialize distribution records
    const distributionPromises = platformsToPublish.map(async (platform: string) => {
      const insertQuery = `
        INSERT INTO event_distributions (event_id, platform, status, created_at)
        VALUES ($1, $2, 'pending', NOW())
        ON CONFLICT (event_id, platform) 
        DO UPDATE SET status = 'pending', created_at = NOW()
        RETURNING *
      `;
      return pool.query(insertQuery, [eventId, platform]);
    });

    await Promise.all(distributionPromises);

    // Use platform manager for real API integrations
    setTimeout(async () => {
      try {
        const results = await platformManager.distributeEvent(eventData, platformsToPublish);
        console.log(`Distribution completed for event ${eventId}:`, results);
        
        // Update database with results  
        for (const result of results) {
          const updateQuery = `
            UPDATE event_distributions 
            SET status = $1, platform_event_id = $2, platform_url = $3, error_message = $4, posted_at = $5
            WHERE event_id = $6 AND platform = $7
          `;
          const values = [
            result.success ? 'published' : 'failed',
            result.platformId || null,
            result.platformUrl || null,
            result.error || null,
            result.success ? new Date() : null,
            eventId,
            result.platform
          ];
          await pool.query(updateQuery, values);
        }
      } catch (error) {
        console.error(`Distribution failed for event ${eventId}:`, error);
        
        // Mark all platforms as failed
        for (const platform of platformsToPublish) {
          const updateQuery = `
            UPDATE event_distributions 
            SET status = 'failed', error_message = $1
            WHERE event_id = $2 AND platform = $3
          `;
          await pool.query(updateQuery, [error instanceof Error ? error.message : 'Unknown error', eventId, platform]);
        }
      }
    }, 1000);

    res.json({ 
      message: 'Distribution initiated',
      event_id: eventId,
      platforms: platformsToPublish
    });

  } catch (error) {
    console.error('Error initiating distribution:', error);
    res.status(500).json({ error: 'Failed to initiate distribution' });
  }
});

// Get distribution status for an event
router.get('/status/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const query = `
      SELECT platform, status, platform_event_id, error_message, posted_at, created_at
      FROM event_distributions
      WHERE event_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [eventId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching distribution status:', error);
    res.status(500).json({ error: 'Failed to fetch distribution status' });
  }
});

// Sync event data from platforms
router.post('/sync/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists
    const eventCheck = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Sync from all platforms
    await platformManager.syncEventFromPlatforms(parseInt(eventId));
    
    res.json({ 
      message: 'Event sync completed',
      event_id: eventId
    });
  } catch (error) {
    console.error('Error syncing event:', error);
    res.status(500).json({ error: 'Failed to sync event from platforms' });
  }
});

// Import events from platforms into our database (past year only)
router.post('/import', async (req, res) => {
  try {
    const { platforms } = req.body;
    
    // Import events from specified platforms (default: eventbrite)
    const result = await platformManager.importEventsFromPlatforms(platforms);
    
    res.json({ 
      message: 'Event import completed',
      imported: result.imported,
      errors: result.errors,
      note: result.note
    });
  } catch (error) {
    console.error('Error importing events from platforms:', error);
    res.status(500).json({ error: 'Failed to import events from platforms' });
  }
});

// Debug endpoint to check Eventbrite events
router.get('/debug/eventbrite-events', async (req, res) => {
  try {
    const EventbriteService = require('../services/platforms/EventbriteService').default;
    const eventbriteService = new EventbriteService();
    const events = await eventbriteService.getOrganizationEvents();
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Debug endpoint to check existing events in database
router.get('/debug/database-events', async (req, res) => {
  try {
    const query = `
      SELECT e.id, e.theme, ed.platform, ed.platform_event_id, ed.status 
      FROM events e 
      LEFT JOIN event_distributions ed ON e.id = ed.event_id 
      ORDER BY e.id
    `;
    const result = await pool.query(query);
    res.json({ events: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching database events:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Fix database constraint (development only)
router.post('/debug/fix-constraint', async (req, res) => {
  try {
    // Fix event_distributions status constraint
    await pool.query('ALTER TABLE event_distributions DROP CONSTRAINT IF EXISTS event_distributions_status_check');
    await pool.query('ALTER TABLE event_distributions ADD CONSTRAINT event_distributions_status_check CHECK (status IN (\'pending\', \'published\', \'success\', \'failed\', \'cancelled\'))');
    
    // Allow venue_id to be NULL in events table
    await pool.query('ALTER TABLE events ALTER COLUMN venue_id DROP NOT NULL');
    
    res.json({ message: 'Database constraints fixed successfully' });
  } catch (error) {
    console.error('Error fixing database constraint:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Clean up failed distributions (development only)
router.post('/debug/cleanup-failed', async (req, res) => {
  try {
    // Delete events with failed distributions and no successful platform_event_id
    const deleteQuery = `
      DELETE FROM events 
      WHERE id IN (
        SELECT DISTINCT e.id 
        FROM events e 
        JOIN event_distributions ed ON e.id = ed.event_id 
        WHERE ed.status = 'failed' AND ed.platform_event_id IS NULL
      )
    `;
    const result = await pool.query(deleteQuery);
    res.json({ message: `Cleaned up ${result.rowCount} failed events` });
  } catch (error) {
    console.error('Error cleaning up failed events:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Remove duplicate events (development only)
router.post('/debug/remove-duplicates', async (req, res) => {
  try {
    // Find and remove duplicate events based on theme and date_time
    // Keep the event with the lowest ID (oldest)
    const duplicateQuery = `
      DELETE FROM events 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM events 
        GROUP BY theme, date_time
      )
    `;
    const result = await pool.query(duplicateQuery);
    res.json({ message: `Removed ${result.rowCount} duplicate events` });
  } catch (error) {
    console.error('Error removing duplicates:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Debug endpoint to show import filtering
router.get('/debug/import-preview', async (req, res) => {
  try {
    const EventbriteService = require('../services/platforms/EventbriteService').default;
    const eventbriteService = new EventbriteService();
    const events = await eventbriteService.getOrganizationEvents();
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const categorized = {
      eligible: [],
      tooOld: [],
      oneYearAgo: oneYearAgo.toISOString()
    };
    
    events.forEach((event: any) => {
      const eventDate = new Date(event.start.utc);
      const now = new Date();
      const eventInfo = {
        name: event.name.text,
        date: event.start.utc,
        id: event.id,
        age: Math.round((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)) + ' days ago'
      };
      
      if (eventDate >= oneYearAgo) {
        (categorized.eligible as any[]).push(eventInfo);
      } else {
        (categorized.tooOld as any[]).push(eventInfo);
      }
    });
    
    res.json(categorized);
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Test platform connections
router.get('/test-connections', async (req, res) => {
  try {
    const results = await platformManager.testConnections();
    res.json({ results });
  } catch (error) {
    console.error('Error testing platform connections:', error);
    res.status(500).json({ error: 'Failed to test platform connections' });
  }
});

module.exports = router;