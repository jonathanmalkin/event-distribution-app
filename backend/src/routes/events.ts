import express from 'express';
import pool from '../config/database';
import { Event } from '../models/Event';

const router = express.Router();

// Create new event
router.post('/', async (req, res) => {
  try {
    const {
      date_time,
      venue_id,
      manual_theme_override,
      theme,
      description,
      banner_image_url,
      status = 'draft',
      organizer_id
    }: Partial<Event> = req.body;

    if (!date_time || !venue_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: date_time, venue_id' 
      });
    }

    // Get default organizer if none provided
    let finalOrganizerId = organizer_id;
    if (!finalOrganizerId) {
      const defaultOrganizerResult = await pool.query('SELECT id FROM organizers WHERE is_default = true');
      if (defaultOrganizerResult.rows.length > 0) {
        finalOrganizerId = defaultOrganizerResult.rows[0].id;
      }
    }

    const query = `
      INSERT INTO events (date_time, venue_id, manual_theme_override, theme, description, banner_image_url, status, organizer_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [date_time, venue_id, manual_theme_override, theme, description, banner_image_url, status, finalOrganizerId];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get all events with venue information and platform status
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      startDate, 
      endDate, 
      venue, 
      status, 
      search, 
      sort = 'date_time' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Add filtering conditions
    if (startDate) {
      paramCount++;
      whereConditions.push(`e.date_time >= $${paramCount}`);
      queryParams.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      whereConditions.push(`e.date_time <= $${paramCount}`);
      queryParams.push(endDate);
    }
    
    if (venue) {
      paramCount++;
      whereConditions.push(`e.venue_id = $${paramCount}`);
      queryParams.push(venue);
    }
    
    if (status) {
      paramCount++;
      whereConditions.push(`e.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    if (search) {
      paramCount++;
      whereConditions.push(`(e.theme ILIKE $${paramCount} OR e.description ILIKE $${paramCount} OR e.manual_theme_override ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort column
    const validSorts = ['date_time', 'theme', 'created_at', 'status'];
    const sortColumn = validSorts.includes(sort as string) ? sort : 'date_time';
    
    const query = `
      SELECT e.*, 
             v.name as venue_name,
             v.street_address as venue_street,
             v.city as venue_city,
             v.state as venue_state,
             v.zip_code as venue_zip,
             COUNT(*) OVER() as total_count
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      ${whereClause}
      ORDER BY e.${sortColumn} DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);
    
    // Get platform distribution status for all events
    const eventIds = result.rows.map(row => row.id);
    let distributionData = [];
    
    if (eventIds.length > 0) {
      const distributionQuery = `
        SELECT event_id, platform, status, platform_event_id, error_message, posted_at
        FROM event_distributions 
        WHERE event_id = ANY($1)
        ORDER BY event_id, platform
      `;
      const distributionResult = await pool.query(distributionQuery, [eventIds]);
      distributionData = distributionResult.rows;
    }
    
    // Transform the flat result into nested structure with platform status
    const events = result.rows.map(row => {
      const event: any = {
        id: row.id,
        date_time: row.date_time,
        venue_id: row.venue_id,
        theme: row.theme,
        description: row.description,
        banner_image_url: row.banner_image_url,
        manual_theme_override: row.manual_theme_override,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        legacy_general_location: row.legacy_general_location,
        legacy_specific_location: row.legacy_specific_location
      };
      
      if (row.venue_id && row.venue_name) {
        event.venue = {
          id: row.venue_id,
          name: row.venue_name,
          street_address: row.venue_street,
          city: row.venue_city,
          state: row.venue_state,
          zip_code: row.venue_zip
        };
      }
      
      // Add platform distribution status
      event.platform_status = distributionData
        .filter(dist => dist.event_id === row.id)
        .reduce((acc, dist) => {
          acc[dist.platform] = {
            status: dist.status,
            platform_event_id: dist.platform_event_id,
            error_message: dist.error_message,
            posted_at: dist.posted_at
          };
          return acc;
        }, {});
      
      return event;
    });
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    res.json({
      events,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get calendar view for specific month
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const query = `
      SELECT e.*, 
             v.name as venue_name,
             v.city as venue_city,
             v.state as venue_state
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.date_time >= $1 AND e.date_time <= $2
      ORDER BY e.date_time ASC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    
    // Group events by date
    const eventsByDate = result.rows.reduce((acc, event) => {
      const dateKey = new Date(event.date_time).toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      
      acc[dateKey].push({
        id: event.id,
        theme: event.theme || event.manual_theme_override,
        date_time: event.date_time,
        venue_name: event.venue_name,
        status: event.status
      });
      
      return acc;
    }, {});
    
    res.json(eventsByDate);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Get single event with full platform status details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event with venue information
    const eventQuery = `
      SELECT e.*, 
             v.name as venue_name,
             v.street_address as venue_street,
             v.city as venue_city,
             v.state as venue_state,
             v.zip_code as venue_zip
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = $1
    `;
    const eventResult = await pool.query(eventQuery, [id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    
    // Get platform distribution history
    const distributionQuery = `
      SELECT platform, status, platform_event_id, error_message, posted_at, created_at
      FROM event_distributions 
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    const distributionResult = await pool.query(distributionQuery, [id]);
    
    // Get RSVP count
    const rsvpQuery = 'SELECT COUNT(*) as rsvp_count FROM event_rsvps WHERE event_id = $1';
    const rsvpResult = await pool.query(rsvpQuery, [id]);
    
    // Transform event data
    const eventData: any = {
      id: event.id,
      date_time: event.date_time,
      venue_id: event.venue_id,
      theme: event.theme,
      description: event.description,
      banner_image_url: event.banner_image_url,
      manual_theme_override: event.manual_theme_override,
      status: event.status,
      created_at: event.created_at,
      updated_at: event.updated_at,
      rsvp_count: parseInt(rsvpResult.rows[0].rsvp_count)
    };
    
    if (event.venue_id && event.venue_name) {
      eventData.venue = {
        id: event.venue_id,
        name: event.venue_name,
        street_address: event.venue_street,
        city: event.venue_city,
        state: event.venue_state,
        zip_code: event.venue_zip
      };
    }
    
    // Add platform status with full history
    eventData.platform_status = distributionResult.rows.reduce((acc, dist) => {
      if (!acc[dist.platform]) {
        acc[dist.platform] = [];
      }
      acc[dist.platform].push({
        status: dist.status,
        platform_event_id: dist.platform_event_id,
        error_message: dist.error_message,
        posted_at: dist.posted_at,
        created_at: dist.created_at
      });
      return acc;
    }, {});

    res.json(eventData);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE events 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(updates)];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM events WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Repost event to specific platforms
router.post('/:id/repost', async (req, res) => {
  try {
    const { id } = req.params;
    const { platforms } = req.body;

    if (!platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ error: 'Platforms array is required' });
    }

    // Verify event exists
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await pool.query(eventQuery, [id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create/update distribution records for retry
    const results = [];
    for (const platform of platforms) {
      const insertQuery = `
        INSERT INTO event_distributions (event_id, platform, status, created_at)
        VALUES ($1, $2, 'pending', NOW())
        ON CONFLICT (event_id, platform) 
        DO UPDATE SET status = 'pending', created_at = NOW()
        RETURNING *
      `;
      
      try {
        const result = await pool.query(insertQuery, [id, platform]);
        results.push({
          platform,
          status: 'queued',
          distribution_id: result.rows[0].id
        });
      } catch (error) {
        results.push({
          platform,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Repost requests queued',
      results
    });
  } catch (error) {
    console.error('Error reposting event:', error);
    res.status(500).json({ error: 'Failed to repost event' });
  }
});

// Get event statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_events,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events,
        COUNT(CASE WHEN date_time > NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN date_time < NOW() THEN 1 END) as past_events
      FROM events
    `;
    
    const platformStatsQuery = `
      SELECT 
        platform,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_posts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_posts
      FROM event_distributions
      GROUP BY platform
    `;

    const [statsResult, platformStatsResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(platformStatsQuery)
    ]);

    const stats = statsResult.rows[0];
    const platformStats = platformStatsResult.rows;

    res.json({
      event_stats: {
        total_events: parseInt(stats.total_events),
        draft_events: parseInt(stats.draft_events),
        published_events: parseInt(stats.published_events),
        upcoming_events: parseInt(stats.upcoming_events),
        past_events: parseInt(stats.past_events)
      },
      platform_stats: platformStats.map(stat => ({
        platform: stat.platform,
        total_posts: parseInt(stat.total_posts),
        successful_posts: parseInt(stat.successful_posts),
        failed_posts: parseInt(stat.failed_posts),
        success_rate: stat.total_posts > 0 
          ? Math.round((stat.successful_posts / stat.total_posts) * 100) 
          : 0
      }))
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { action, event_ids, data } = req.body;

    if (!action || !event_ids || !Array.isArray(event_ids)) {
      return res.status(400).json({ error: 'Action and event_ids array are required' });
    }

    let result;
    
    switch (action) {
      case 'delete':
        const deleteQuery = 'DELETE FROM events WHERE id = ANY($1) RETURNING id';
        result = await pool.query(deleteQuery, [event_ids]);
        res.json({
          message: `${result.rows.length} events deleted`,
          deleted_ids: result.rows.map(row => row.id)
        });
        break;

      case 'update_status':
        if (!data || !data.status) {
          return res.status(400).json({ error: 'Status is required for bulk status update' });
        }
        const updateQuery = 'UPDATE events SET status = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id';
        result = await pool.query(updateQuery, [data.status, event_ids]);
        res.json({
          message: `${result.rows.length} events updated to ${data.status}`,
          updated_ids: result.rows.map(row => row.id)
        });
        break;

      case 'repost':
        if (!data || !data.platforms || !Array.isArray(data.platforms)) {
          return res.status(400).json({ error: 'Platforms array is required for bulk repost' });
        }
        
        // Create distribution records for all event/platform combinations
        const insertQueries = [];
        for (const eventId of event_ids) {
          for (const platform of data.platforms) {
            insertQueries.push(
              pool.query(`
                INSERT INTO event_distributions (event_id, platform, status, created_at)
                VALUES ($1, $2, 'pending', NOW())
                ON CONFLICT (event_id, platform) 
                DO UPDATE SET status = 'pending', created_at = NOW()
              `, [eventId, platform])
            );
          }
        }
        
        await Promise.all(insertQueries);
        
        res.json({
          message: `Bulk repost queued for ${event_ids.length} events across ${data.platforms.length} platforms`,
          queued_posts: event_ids.length * data.platforms.length
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid bulk action' });
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

module.exports = router;