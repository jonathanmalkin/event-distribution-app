import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Trigger distribution for an event
router.post('/publish/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { platforms } = req.body;

    // Get event details
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await pool.query(eventQuery, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    const platformsToPublish = platforms || ['wordpress', 'facebook', 'instagram', 'eventbrite', 'meetup', 'fetlife'];

    // Initialize distribution records
    const distributionPromises = platformsToPublish.map(async (platform: string) => {
      const insertQuery = `
        INSERT INTO event_distributions (event_id, platform, status, created_at)
        VALUES ($1, $2, 'pending', NOW())
        RETURNING *
      `;
      return pool.query(insertQuery, [eventId, platform]);
    });

    await Promise.all(distributionPromises);

    // TODO: Implement actual platform posting logic
    // For now, just simulate the process
    
    setTimeout(async () => {
      // Simulate distribution process
      for (const platform of platformsToPublish) {
        try {
          // Simulate platform-specific posting
          const success = await simulatePlatformPost(platform, event);
          
          const updateQuery = `
            UPDATE event_distributions 
            SET status = $1, posted_at = NOW(), platform_event_id = $2
            WHERE event_id = $3 AND platform = $4
          `;
          
          await pool.query(updateQuery, [
            success ? 'success' : 'failed',
            success ? `${platform}_${Date.now()}` : null,
            eventId,
            platform
          ]);
        } catch (error) {
          const updateQuery = `
            UPDATE event_distributions 
            SET status = 'failed', error_message = $1
            WHERE event_id = $2 AND platform = $3
          `;
          
          await pool.query(updateQuery, [
            error instanceof Error ? error.message : 'Unknown error',
            eventId,
            platform
          ]);
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

// Simulate platform posting (to be replaced with actual integrations)
async function simulatePlatformPost(platform: string, event: any): Promise<boolean> {
  return new Promise((resolve) => {
    // Simulate API call delay
    setTimeout(() => {
      // Simulate 90% success rate
      const success = Math.random() > 0.1;
      console.log(`${platform} posting ${success ? 'succeeded' : 'failed'} for event: ${event.theme}`);
      resolve(success);
    }, Math.random() * 2000 + 1000); // 1-3 second delay
  });
}

module.exports = router;