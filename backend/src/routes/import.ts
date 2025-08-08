import { Router, Request, Response } from 'express';
import { WordPressImportService } from '../services/WordPressImportService';
import pool from '../config/database';

const router = Router();
const importService = new WordPressImportService();

// POST /api/import/wordpress/events - Start WordPress event import
router.post('/wordpress/events', async (req: Request, res: Response) => {
  try {
    const options = {
      dateRange: req.body.dateRange ? {
        from: new Date(req.body.dateRange.from),
        to: new Date(req.body.dateRange.to)
      } : undefined,
      includeImages: req.body.includeImages ?? true,
      conflictStrategy: req.body.conflictStrategy || 'manual',
      dryRun: req.body.dryRun ?? false,
      statusFilter: req.body.statusFilter || ['publish', 'draft']
    };

    console.log('Starting WordPress import with options:', options);
    
    const { jobId, result } = await importService.importEvents(options);
    
    res.json({
      success: true,
      jobId,
      result,
      message: 'WordPress import completed successfully'
    });
  } catch (error) {
    console.error('WordPress import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: 'Import failed',
      message
    });
  }
});

// GET /api/import/wordpress/status/:jobId - Get import job status
router.get('/wordpress/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = await importService.getImportStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Import job not found'
      });
    }

    res.json({
      success: true,
      job: {
        id: status.job_id,
        status: status.status,
        progress: status.progress,
        options: status.options,
        result: status.result,
        error: status.error_message,
        createdAt: status.created_at,
        startedAt: status.started_at,
        completedAt: status.completed_at
      }
    });
  } catch (error) {
    console.error('Error getting import status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import status'
    });
  }
});

// POST /api/import/wordpress/events/:wpEventId - Import single WordPress event
router.post('/wordpress/events/:wpEventId', async (req: Request, res: Response) => {
  try {
    const wpEventId = parseInt(req.params.wpEventId);
    
    if (isNaN(wpEventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid WordPress event ID'
      });
    }

    // This would need to be implemented to import a single event
    res.status(501).json({
      success: false,
      error: 'Single event import not yet implemented'
    });
  } catch (error) {
    console.error('Error importing single event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import event'
    });
  }
});

// GET /api/import/wordpress/conflicts - Get unresolved conflicts
router.get('/wordpress/conflicts', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, e.theme as local_theme, e.date_time as local_date, e.status as local_status
      FROM import_conflicts c
      LEFT JOIN events e ON c.event_id = e.id
      WHERE c.resolution = 'pending'
      ORDER BY c.created_at DESC
    `);

    const conflicts = result.rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      wordpressId: row.wordpress_id,
      conflictType: row.conflict_type,
      localValue: row.local_value,
      wordpressValue: row.wordpress_value,
      strategy: row.strategy,
      createdAt: row.created_at,
      localEvent: {
        theme: row.local_theme,
        date_time: row.local_date,
        status: row.local_status
      }
    }));

    res.json({
      success: true,
      conflicts,
      total: conflicts.length
    });
  } catch (error) {
    console.error('Error getting conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conflicts'
    });
  }
});

// POST /api/import/wordpress/conflicts/:conflictId/resolve - Resolve a conflict
router.post('/wordpress/conflicts/:conflictId/resolve', async (req: Request, res: Response) => {
  try {
    const conflictId = parseInt(req.params.conflictId);
    const { resolution, useValue } = req.body; // resolution: 'local' | 'wordpress' | 'custom', useValue: any
    
    if (isNaN(conflictId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conflict ID'
      });
    }

    // Get the conflict details
    const conflictResult = await pool.query(
      'SELECT * FROM import_conflicts WHERE id = $1 AND resolution = $2',
      [conflictId, 'pending']
    );

    if (conflictResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conflict not found or already resolved'
      });
    }

    const conflict = conflictResult.rows[0];
    
    // Determine the value to use
    let valueToUse;
    if (resolution === 'local') {
      valueToUse = conflict.local_value;
    } else if (resolution === 'wordpress') {
      valueToUse = conflict.wordpress_value;
    } else if (resolution === 'custom') {
      valueToUse = useValue;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution type'
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update the event with the resolved value
      if (conflict.conflict_type === 'content') {
        await client.query(
          'UPDATE events SET theme = $1, sync_status = $2, updated_at = NOW() WHERE id = $3',
          [valueToUse, 'synced', conflict.event_id]
        );
      } else if (conflict.conflict_type === 'datetime') {
        await client.query(
          'UPDATE events SET date_time = $1, sync_status = $2, updated_at = NOW() WHERE id = $3',
          [new Date(valueToUse), 'synced', conflict.event_id]
        );
      } else if (conflict.conflict_type === 'status') {
        await client.query(
          'UPDATE events SET status = $1, sync_status = $2, updated_at = NOW() WHERE id = $3',
          [valueToUse, 'synced', conflict.event_id]
        );
      }

      // Mark conflict as resolved
      await client.query(
        'UPDATE import_conflicts SET resolution = $1, resolved_at = NOW(), resolved_by = $2 WHERE id = $3',
        ['resolved', 'manual', conflictId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Conflict resolved successfully',
        conflictId,
        resolution,
        valueUsed: valueToUse
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve conflict'
    });
  }
});

// GET /api/import/wordpress/venues - Get WordPress venue mappings
router.get('/wordpress/venues', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT wv.*, v.name as local_name, v.street_address, v.city, v.state
      FROM wordpress_venues wv
      LEFT JOIN venues v ON wv.local_venue_id = v.id
      ORDER BY wv.created_at DESC
    `);

    const venues = result.rows.map(row => ({
      id: row.id,
      wordpressVenueId: row.wordpress_venue_id,
      localVenueId: row.local_venue_id,
      wordpressName: row.wordpress_name,
      wordpressAddress: row.wordpress_address,
      localVenue: {
        name: row.local_name,
        address: `${row.street_address}, ${row.city}, ${row.state}`
      },
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      venues,
      total: venues.length
    });
  } catch (error) {
    console.error('Error getting venue mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get venue mappings'
    });
  }
});

// GET /api/import/wordpress/history - Get import history
router.get('/wordpress/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT * FROM wordpress_imports
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM wordpress_imports');
    const total = parseInt(countResult.rows[0].count);

    const imports = result.rows.map(row => ({
      id: row.id,
      jobId: row.job_id,
      status: row.status,
      progress: row.progress,
      options: row.options,
      result: row.result,
      error: row.error_message,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.started_at && row.completed_at 
        ? Math.round((new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()) / 1000)
        : null
    }));

    res.json({
      success: true,
      imports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting import history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import history'
    });
  }
});

// DELETE /api/import/wordpress/events/:eventId - Delete imported event
router.delete('/wordpress/events/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    // Check if event is imported from WordPress
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND wordpress_event_id IS NOT NULL',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Imported event not found'
      });
    }

    // Delete the event
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);

    res.json({
      success: true,
      message: 'Imported event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting imported event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// POST /api/import/wordpress/venues - Import all WordPress venues
router.post('/wordpress/venues', async (req: Request, res: Response) => {
  try {
    const options = {
      dryRun: req.body.dryRun ?? false
    };

    console.log('Starting WordPress venue import with options:', options);
    
    const result = await importService.importVenues(options);
    
    res.json({
      success: true,
      result,
      message: `Venue import completed: ${result.imported} imported, ${result.matched} matched, ${result.errors.length} errors`
    });
  } catch (error) {
    console.error('WordPress venue import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: 'Venue import failed',
      message
    });
  }
});

// POST /api/import/wordpress/organizer - Import default organizer
router.post('/wordpress/organizer', async (req: Request, res: Response) => {
  try {
    console.log('Starting WordPress organizer import...');
    
    const result = await importService.importDefaultOrganizer();
    
    res.json({
      success: true,
      result,
      message: result.message
    });
  } catch (error) {
    console.error('WordPress organizer import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: 'Organizer import failed',
      message
    });
  }
});

// POST /api/import/wordpress/organizer/apply - Apply default organizer to all events
router.post('/wordpress/organizer/apply', async (req: Request, res: Response) => {
  try {
    console.log('Applying default organizer to events...');
    
    const result = await importService.applyDefaultOrganizerToEvents();
    
    res.json({
      success: true,
      result,
      message: `Applied default organizer to ${result.updated} events`
    });
  } catch (error) {
    console.error('Error applying default organizer:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      success: false,
      error: 'Failed to apply default organizer',
      message
    });
  }
});

// GET /api/import/organizers - Get all organizers
router.get('/organizers', async (req: Request, res: Response) => {
  try {
    const organizers = await importService.getAllOrganizers();
    
    res.json({
      success: true,
      organizers,
      total: organizers.length
    });
  } catch (error) {
    console.error('Error getting organizers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organizers'
    });
  }
});

// GET /api/import/organizers/default - Get default organizer
router.get('/organizers/default', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM organizers WHERE is_default = true');
    const organizer = result.rows[0] || null;
    
    res.json({
      success: true,
      organizer,
      hasDefault: !!organizer
    });
  } catch (error) {
    console.error('Error getting default organizer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get default organizer'
    });
  }
});

export default router;