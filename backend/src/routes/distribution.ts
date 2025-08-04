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