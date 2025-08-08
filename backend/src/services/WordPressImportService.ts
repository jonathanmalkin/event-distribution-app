import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WordPressService } from './platforms/WordPressService';
import { Event, Venue } from '../models/Event';
import pool from '../config/database';
import { sanitizeVenueName, sanitizeWordPressContent, sanitizeEmail } from '../utils/sanitization';

interface WordPressEvent {
  id: number;
  title: string | { rendered: string };  // Tribe Events API uses string, WordPress API uses object
  description?: string;                   // Tribe Events API field
  content?: { rendered: string };         // Standard WordPress API field
  status: 'publish' | 'draft' | 'private';
  start_date: string;
  end_date: string;
  all_day: boolean;
  timezone: string;
  url: string;
  modified: string;
  featured_media?: number;
  venue?: {
    id: number;
    venue: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  organizer?: Array<{
    id: number;
    organizer: string;
    email: string;
  }> | {
    id: number;
    organizer: string;
    email: string;
  };
  meta?: {
    _kinky_coffee_event_id?: string;
    _kinky_coffee_general_location?: string;
    _kinky_coffee_rsvp_required?: string;
  };
}

interface ImportOptions {
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeImages?: boolean;
  conflictStrategy?: 'local' | 'wordpress' | 'latest' | 'manual';
  dryRun?: boolean;
  statusFilter?: string[];
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: ImportError[];
  venuesCreated: number;
  imagesDownloaded: number;
}

interface ImportError {
  eventId?: number;
  wordpressId: number;
  message: string;
  error?: string;
}

interface EventConflict {
  eventId: number;
  wordpressId: number;
  conflictType: 'content' | 'venue' | 'image' | 'status' | 'datetime';
  localValue: any;
  wordpressValue: any;
  lastModified?: { local?: Date; wordpress?: Date };
}

export class WordPressImportService {
  private wordpressService: WordPressService;

  constructor() {
    this.wordpressService = new WordPressService();
  }

  async importEvents(options: ImportOptions = {}): Promise<{ jobId: string; result: ImportResult }> {
    const jobId = uuidv4();
    const defaultOptions: ImportOptions = {
      includeImages: true,
      conflictStrategy: 'manual',
      dryRun: false,
      statusFilter: ['publish', 'draft'],
      ...options
    };

    // Start import job tracking
    await this.createImportJob(jobId, defaultOptions);

    try {
      const result = await this.performImport(jobId, defaultOptions);
      await this.updateImportJob(jobId, 'completed', 100, result);
      return { jobId, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateImportJob(jobId, 'failed', 0, undefined, errorMessage);
      throw error;
    }
  }

  private async performImport(jobId: string, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      conflicts: 0,
      errors: [],
      venuesCreated: 0,
      imagesDownloaded: 0
    };

    console.log('Starting WordPress import with options:', options);
    
    // Fetch WordPress events
    const wpEvents = await this.fetchWordPressEvents(options);
    console.log(`Fetched ${wpEvents.length} events from WordPress`);

    let processed = 0;
    for (const wpEvent of wpEvents) {
      try {
        await this.updateImportJob(jobId, 'processing', Math.round((processed / wpEvents.length) * 100));
        
        const importResult = await this.importSingleEvent(wpEvent, options);
        
        if (importResult.action === 'imported') {
          result.imported++;
        } else if (importResult.action === 'updated') {
          result.updated++;
        } else if (importResult.action === 'skipped') {
          result.skipped++;
        } else if (importResult.action === 'conflict') {
          result.conflicts++;
        }

        if (importResult.venueCreated) {
          result.venuesCreated++;
        }

        if (importResult.imageDownloaded) {
          result.imagesDownloaded++;
        }

      } catch (error) {
        console.error(`Error importing event ${wpEvent.id}:`, error);
        result.errors.push({
          wordpressId: wpEvent.id,
          message: `Failed to import event: ${typeof wpEvent.title === 'string' ? wpEvent.title : wpEvent.title?.rendered || 'Unknown'}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      processed++;
    }

    console.log('Import completed:', result);
    return result;
  }

  private async fetchWordPressEvents(options: ImportOptions): Promise<WordPressEvent[]> {
    const baseURL = process.env.WORDPRESS_SITE_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const password = process.env.WORDPRESS_PASSWORD;

    if (!baseURL || !username || !password) {
      throw new Error('WordPress credentials not configured');
    }

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const events: WordPressEvent[] = [];
    
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const params: any = {
          page,
          per_page: 50,
          status: options.statusFilter?.join(',') || 'publish,draft'
        };

        // Add date filtering if specified
        if (options.dateRange) {
          if (options.dateRange.from) {
            params.start_date_after = options.dateRange.from.toISOString();
          }
          if (options.dateRange.to) {
            params.start_date_before = options.dateRange.to.toISOString();
          }
        } else {
          // Default: last 6 months to next 12 months
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const twelveMonthsFromNow = new Date();
          twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);
          
          params.start_date_after = sixMonthsAgo.toISOString();
          params.start_date_before = twelveMonthsFromNow.toISOString();
        }

        const response = await axios.get(`${baseURL}/wp-json/tribe/events/v1/events`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          params,
          timeout: 30000
        });

        if (response.data.events && response.data.events.length > 0) {
          events.push(...response.data.events);
          page++;
          
          // Check if there are more pages
          hasMore = response.data.events.length === 50;
        } else {
          hasMore = false;
        }

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error fetching WordPress events page ${page}:`, error);
        hasMore = false;
        
        if (axios.isAxiosError(error)) {
          throw new Error(`WordPress API error: ${error.response?.status} ${error.response?.statusText}`);
        }
        throw error;
      }
    }

    return events;
  }

  private async importSingleEvent(wpEvent: WordPressEvent, options: ImportOptions): Promise<{
    action: 'imported' | 'updated' | 'skipped' | 'conflict';
    venueCreated: boolean;
    imageDownloaded: boolean;
  }> {
    // Check if event already exists
    const existingEvent = await this.findLocalEventByWordPressId(wpEvent.id);
    
    if (existingEvent) {
      // Event exists - check for conflicts
      const conflicts = await this.detectConflicts(existingEvent, wpEvent);
      
      if (conflicts.length > 0) {
        if (options.conflictStrategy === 'manual') {
          await this.saveConflicts(conflicts);
          return { action: 'conflict', venueCreated: false, imageDownloaded: false };
        } else {
          // Auto-resolve conflicts based on strategy
          const resolvedEvent = await this.resolveConflicts(existingEvent, wpEvent, conflicts, options.conflictStrategy!);
          if (!options.dryRun) {
            await this.updateLocalEvent(resolvedEvent);
          }
          return { action: 'updated', venueCreated: false, imageDownloaded: false };
        }
      } else {
        // No conflicts, but check if update needed
        if (new Date(wpEvent.modified) > (existingEvent.last_synced_at || new Date(0))) {
          const updatedEvent = await this.mapWordPressEventToLocal(wpEvent, existingEvent.venue_id);
          updatedEvent.id = existingEvent.id;
          
          if (!options.dryRun) {
            await this.updateLocalEvent(updatedEvent);
          }
          return { action: 'updated', venueCreated: false, imageDownloaded: false };
        }
        
        return { action: 'skipped', venueCreated: false, imageDownloaded: false };
      }
    } else {
      // New event - import it
      const venueResult = await this.handleVenue(wpEvent.venue);
      let imageDownloaded = false;
      
      const localEvent = await this.mapWordPressEventToLocal(wpEvent, venueResult.venueId);
      
      // Handle banner image if requested
      if (options.includeImages && wpEvent.featured_media) {
        try {
          const imageUrl = await this.downloadEventImage(wpEvent.featured_media);
          if (imageUrl) {
            localEvent.banner_image_url = imageUrl;
            imageDownloaded = true;
          }
        } catch (error) {
          console.warn(`Failed to download image for event ${wpEvent.id}:`, error);
        }
      }

      if (!options.dryRun) {
        await this.createLocalEvent(localEvent);
      }
      
      return { 
        action: 'imported', 
        venueCreated: venueResult.created, 
        imageDownloaded 
      };
    }
  }

  private async mapWordPressEventToLocal(wpEvent: WordPressEvent, venueId: number): Promise<Event> {
    // Handle The Events Calendar plugin API structure (different from standard WordPress)
    // Tribe Events API returns title and description as direct strings, not objects with .rendered
    let title: string;
    let content: string;
    
    if (typeof wpEvent.title === 'string') {
      // Tribe Events API format - title is a direct string
      title = wpEvent.title;
    } else if (wpEvent.title?.rendered) {
      // Standard WordPress API format - title has .rendered property
      title = wpEvent.title.rendered;
    } else {
      // Fallback
      title = `Imported Event ${wpEvent.id}`;
    }
    
    if (typeof wpEvent.description === 'string') {
      // Tribe Events API format - description is a direct string
      content = wpEvent.description;
    } else if (wpEvent.content?.rendered) {
      // Standard WordPress API format - content has .rendered property  
      content = wpEvent.content.rendered;
    } else {
      // Fallback
      content = '';
    }
    
    console.log(`DEBUG: Extracted title: "${title}"`);
    console.log(`DEBUG: Extracted content: "${content.substring(0, 100)}..."`);
    
    // Handle missing dates
    const startDate = wpEvent.start_date ? new Date(wpEvent.start_date) : new Date();
    
    const localEvent = {
      theme: title,
      description: this.stripHtmlTags(content),
      date_time: startDate,
      venue_id: venueId,
      status: (wpEvent.status === 'publish' ? 'published' : 'draft') as Event['status'],
      wordpress_event_id: wpEvent.id,
      wordpress_url: wpEvent.url || '',
      imported_at: new Date(),
      last_synced_at: new Date(),
      wordpress_modified_at: wpEvent.modified ? new Date(wpEvent.modified) : new Date(),
      sync_status: 'synced' as Event['sync_status']
    };
    
    console.log('DEBUG: Final mapped local event:', localEvent);
    return localEvent;
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private async handleVenue(wpVenue?: WordPressEvent['venue']): Promise<{ venueId: number; created: boolean }> {
    if (!wpVenue || !wpVenue.venue) {
      // Use default venue or create a generic one
      const defaultVenueId = 1; // Assuming venue ID 1 exists
      return { venueId: defaultVenueId, created: false };
    }

    // Check if we already have this WordPress venue mapped
    const venueMapping = await this.findVenueMapping(wpVenue.id);
    if (venueMapping) {
      return { venueId: venueMapping.local_venue_id, created: false };
    }

    // Try to match existing local venue
    const existingVenue = await this.findMatchingLocalVenue(wpVenue);
    if (existingVenue) {
      // Create mapping
      await this.createVenueMapping(wpVenue.id, existingVenue.id!, wpVenue.venue, 
        `${wpVenue.address || ''}, ${wpVenue.city || ''}, ${wpVenue.state || ''}`);
      return { venueId: existingVenue.id!, created: false };
    }

    // Create new local venue - ensure name is not empty and sanitized
    const rawVenueName = wpVenue.venue || `WordPress Venue ${wpVenue.id}`;
    const venueName = sanitizeVenueName(rawVenueName);
    const newVenue: Venue = {
      name: venueName,
      street_address: sanitizeWordPressContent(wpVenue.address || ''),
      city: sanitizeWordPressContent(wpVenue.city || ''),
      state: sanitizeWordPressContent(wpVenue.state || ''),
      zip_code: wpVenue.zip || ''
    };

    const venueId = await this.createLocalVenue(newVenue);
    await this.createVenueMapping(wpVenue.id, venueId, venueName, 
      `${wpVenue.address || ''}, ${wpVenue.city || ''}, ${wpVenue.state || ''}`);
    
    return { venueId, created: true };
  }

  // Database operations
  private async findLocalEventByWordPressId(wordpressId: number): Promise<Event | null> {
    const result = await pool.query(
      'SELECT * FROM events WHERE wordpress_event_id = $1',
      [wordpressId]
    );
    return result.rows[0] || null;
  }

  private async createLocalEvent(event: Event): Promise<number> {
    const result = await pool.query(`
      INSERT INTO events (
        theme, description, date_time, venue_id, banner_image_url, status,
        wordpress_event_id, wordpress_url, imported_at, last_synced_at,
        wordpress_modified_at, sync_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id
    `, [
      event.theme, event.description, event.date_time, event.venue_id,
      event.banner_image_url, event.status, event.wordpress_event_id,
      event.wordpress_url, event.imported_at, event.last_synced_at,
      event.wordpress_modified_at, event.sync_status
    ]);
    return result.rows[0].id;
  }

  private async updateLocalEvent(event: Event): Promise<void> {
    await pool.query(`
      UPDATE events SET
        theme = $1, description = $2, date_time = $3, venue_id = $4,
        banner_image_url = $5, status = $6, last_synced_at = $7,
        wordpress_modified_at = $8, sync_status = $9, updated_at = NOW()
      WHERE id = $10
    `, [
      event.theme, event.description, event.date_time, event.venue_id,
      event.banner_image_url, event.status, new Date(), event.wordpress_modified_at,
      event.sync_status, event.id
    ]);
  }

  private async findVenueMapping(wordpressVenueId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM wordpress_venues WHERE wordpress_venue_id = $1',
      [wordpressVenueId]
    );
    return result.rows[0] || null;
  }

  private async findMatchingLocalVenue(wpVenue: WordPressEvent['venue']): Promise<Venue | null> {
    if (!wpVenue) return null;
    
    // Try exact name match first
    let result = await pool.query(
      'SELECT * FROM venues WHERE LOWER(name) = LOWER($1)',
      [wpVenue.venue]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Try name and city match
    if (wpVenue.city) {
      result = await pool.query(
        'SELECT * FROM venues WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)',
        [wpVenue.venue, wpVenue.city]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    return null;
  }

  private async createLocalVenue(venue: Venue): Promise<number> {
    const result = await pool.query(`
      INSERT INTO venues (name, street_address, city, state, zip_code, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, [venue.name, venue.street_address, venue.city, venue.state, venue.zip_code]);
    return result.rows[0].id;
  }

  private async createVenueMapping(wordpressVenueId: number, localVenueId: number, 
    name: string, address: string): Promise<void> {
    await pool.query(`
      INSERT INTO wordpress_venues (wordpress_venue_id, local_venue_id, wordpress_name, wordpress_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [wordpressVenueId, localVenueId, name, address]);
  }

  private async downloadEventImage(mediaId: number): Promise<string | null> {
    // This would download the WordPress media and store it locally
    // For now, we'll return the WordPress media URL
    try {
      const baseURL = process.env.WORDPRESS_SITE_URL;
      const username = process.env.WORDPRESS_USERNAME;
      const password = process.env.WORDPRESS_PASSWORD;
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');

      const response = await axios.get(`${baseURL}/wp-json/wp/v2/media/${mediaId}`, {
        headers: { 'Authorization': `Basic ${credentials}` }
      });

      return response.data.source_url || null;
    } catch (error) {
      console.error('Error downloading event image:', error);
      return null;
    }
  }

  private async detectConflicts(localEvent: Event, wpEvent: WordPressEvent): Promise<EventConflict[]> {
    const conflicts: EventConflict[] = [];

    // Theme/title conflict
    const wpTitle = typeof wpEvent.title === 'string' ? wpEvent.title : wpEvent.title?.rendered || '';
    if (localEvent.theme !== wpTitle) {
      conflicts.push({
        eventId: localEvent.id!,
        wordpressId: wpEvent.id,
        conflictType: 'content',
        localValue: localEvent.theme,
        wordpressValue: wpTitle,
        lastModified: {
          local: localEvent.updated_at,
          wordpress: new Date(wpEvent.modified)
        }
      });
    }

    // Date/time conflict
    const wpDate = new Date(wpEvent.start_date);
    if (localEvent.date_time.getTime() !== wpDate.getTime()) {
      conflicts.push({
        eventId: localEvent.id!,
        wordpressId: wpEvent.id,
        conflictType: 'datetime',
        localValue: localEvent.date_time,
        wordpressValue: wpDate,
        lastModified: {
          local: localEvent.updated_at,
          wordpress: new Date(wpEvent.modified)
        }
      });
    }

    // Status conflict
    const wpStatus = wpEvent.status === 'publish' ? 'published' : 'draft';
    if (localEvent.status !== wpStatus) {
      conflicts.push({
        eventId: localEvent.id!,
        wordpressId: wpEvent.id,
        conflictType: 'status',
        localValue: localEvent.status,
        wordpressValue: wpStatus,
        lastModified: {
          local: localEvent.updated_at,
          wordpress: new Date(wpEvent.modified)
        }
      });
    }

    return conflicts;
  }

  private async resolveConflicts(localEvent: Event, wpEvent: WordPressEvent, 
    conflicts: EventConflict[], strategy: string): Promise<Event> {
    
    const resolvedEvent = { ...localEvent };

    for (const conflict of conflicts) {
      switch (strategy) {
        case 'local':
          // Keep local values - no changes needed
          break;
        case 'wordpress':
          // Use WordPress values
          if (conflict.conflictType === 'content') {
            resolvedEvent.theme = conflict.wordpressValue;
          } else if (conflict.conflictType === 'datetime') {
            resolvedEvent.date_time = conflict.wordpressValue;
          } else if (conflict.conflictType === 'status') {
            resolvedEvent.status = conflict.wordpressValue;
          }
          break;
        case 'latest':
          // Use most recently modified
          if (conflict.lastModified?.wordpress && conflict.lastModified?.local) {
            const useWordPress = conflict.lastModified.wordpress > conflict.lastModified.local;
            if (useWordPress) {
              if (conflict.conflictType === 'content') {
                resolvedEvent.theme = conflict.wordpressValue;
              } else if (conflict.conflictType === 'datetime') {
                resolvedEvent.date_time = conflict.wordpressValue;
              } else if (conflict.conflictType === 'status') {
                resolvedEvent.status = conflict.wordpressValue;
              }
            }
          }
          break;
      }
    }

    resolvedEvent.sync_status = 'synced';
    resolvedEvent.last_synced_at = new Date();
    resolvedEvent.wordpress_modified_at = new Date(wpEvent.modified);

    return resolvedEvent;
  }

  private async saveConflicts(conflicts: EventConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      await pool.query(`
        INSERT INTO import_conflicts (
          event_id, wordpress_id, conflict_type, local_value, wordpress_value, 
          strategy, resolution, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        conflict.eventId, conflict.wordpressId, conflict.conflictType,
        JSON.stringify(conflict.localValue), JSON.stringify(conflict.wordpressValue),
        'manual', 'pending'
      ]);
    }
  }

  // Import job management
  private async createImportJob(jobId: string, options: ImportOptions): Promise<void> {
    await pool.query(`
      INSERT INTO wordpress_imports (job_id, status, progress, options, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [jobId, 'queued', 0, JSON.stringify(options)]);
  }

  private async updateImportJob(jobId: string, status: string, progress: number, 
    result?: ImportResult, error?: string): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    updateFields.push(`status = $${paramIndex++}`);
    values.push(status);

    updateFields.push(`progress = $${paramIndex++}`);
    values.push(progress);

    if (result) {
      updateFields.push(`result = $${paramIndex++}`);
      values.push(JSON.stringify(result));
    }

    if (error) {
      updateFields.push(`error_message = $${paramIndex++}`);
      values.push(error);
    }

    if (status === 'processing' && progress === 0) {
      updateFields.push(`started_at = NOW()`);
    }

    if (status === 'completed' || status === 'failed') {
      updateFields.push(`completed_at = NOW()`);
    }

    values.push(jobId);

    await pool.query(`
      UPDATE wordpress_imports SET ${updateFields.join(', ')}
      WHERE job_id = $${paramIndex}
    `, values);
  }

  async getImportStatus(jobId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM wordpress_imports WHERE job_id = $1',
      [jobId]
    );
    return result.rows[0] || null;
  }

  // Venue Import Methods
  async importVenues(options: ImportOptions = {}): Promise<VenueImportResult> {
    console.log('Starting WordPress venue import...');
    
    const result: VenueImportResult = {
      imported: 0,
      matched: 0,
      errors: []
    };

    try {
      const wpVenues = await this.fetchWordPressVenues();
      console.log(`Found ${wpVenues.length} venues in WordPress`);

      for (const wpVenue of wpVenues) {
        try {
          const venueResult = await this.handleVenue(wpVenue);
          if (venueResult.created) {
            result.imported++;
            console.log(`Imported venue: ${wpVenue.venue}`);
          } else {
            result.matched++;
            console.log(`Matched existing venue: ${wpVenue.venue}`);
          }
        } catch (error) {
          console.error(`Error importing venue ${wpVenue.id}:`, error);
          result.errors.push({
            venueId: wpVenue.id,
            name: wpVenue.venue,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log('Venue import completed:', result);
      return result;
    } catch (error) {
      console.error('Error fetching WordPress venues:', error);
      throw new Error(`Venue import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchWordPressVenues(): Promise<WordPressVenue[]> {
    const baseURL = process.env.WORDPRESS_SITE_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const password = process.env.WORDPRESS_PASSWORD;

    if (!baseURL || !username || !password) {
      throw new Error('WordPress credentials not configured');
    }

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const venues: WordPressVenue[] = [];
    
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await axios.get(`${baseURL}/wp-json/tribe/events/v1/venues`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          },
          params: {
            page,
            per_page: 50
          },
          timeout: 30000
        });

        if (response.data.venues && response.data.venues.length > 0) {
          venues.push(...response.data.venues);
          page++;
          hasMore = response.data.venues.length === 50;
        } else {
          hasMore = false;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching WordPress venues page ${page}:`, error);
        hasMore = false;
        
        if (axios.isAxiosError(error)) {
          throw new Error(`WordPress API error: ${error.response?.status} ${error.response?.statusText}`);
        }
        throw error;
      }
    }

    return venues;
  }

  // Organizer Import Methods
  async importDefaultOrganizer(): Promise<OrganizerImportResult> {
    console.log('Starting default organizer import...');

    try {
      // Check if default organizer already exists
      const existingDefault = await this.getDefaultOrganizer();
      if (existingDefault) {
        console.log('Default organizer already exists:', existingDefault.name);
        return {
          action: 'exists',
          organizer: existingDefault,
          message: 'Default organizer already exists'
        };
      }

      try {
        // Get organizer from first WordPress event with organizer data
        const wpEvents = await this.fetchWordPressEvents({ statusFilter: ['publish'] });
        const eventWithOrganizer = wpEvents.find(event => event.organizer);
        
        const firstOrganizer = Array.isArray(eventWithOrganizer?.organizer) ? eventWithOrganizer.organizer[0] : eventWithOrganizer?.organizer;
        if (firstOrganizer && 'organizer' in firstOrganizer) {
          // Import organizer from WordPress
          const organizerData = {
            name: firstOrganizer.organizer,
            email: firstOrganizer.email || 'events@kinky.coffee',
            wordpress_organizer_id: firstOrganizer.id,
            wordpress_site_url: process.env.WORDPRESS_SITE_URL || '',
            is_default: true,
            imported_at: new Date()
          };

          const organizer = await this.createLocalOrganizer(organizerData);
          console.log('Imported default organizer from WordPress:', organizer.name);

          return {
            action: 'imported',
            organizer,
            message: 'Default organizer imported from WordPress'
          };
        }
      } catch (error) {
        console.warn('Failed to fetch WordPress events or organizer:', error);
      }

      // Create default organizer if none found in WordPress or fetch failed
      const defaultOrganizerData = {
        name: 'Event Organizer',
        email: 'events@kinky.coffee',
        website: process.env.WORDPRESS_SITE_URL || '',
        description: 'Default event organizer',
        is_default: true
      };
      
      const organizer = await this.createLocalOrganizer(defaultOrganizerData);
      console.log('Created default organizer (no WordPress organizer found)');
      
      return {
        action: 'created',
        organizer,
        message: 'Default organizer created (no WordPress organizer found)'
      };
    } catch (error) {
      console.error('Error importing default organizer:', error);
      throw new Error(`Organizer import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async applyDefaultOrganizerToEvents(): Promise<{ updated: number }> {
    console.log('Applying default organizer to events...');

    const defaultOrganizer = await this.getDefaultOrganizer();
    if (!defaultOrganizer) {
      throw new Error('No default organizer found. Please import organizer first.');
    }

    const result = await pool.query(`
      UPDATE events 
      SET organizer_id = $1, updated_at = NOW()
      WHERE organizer_id IS NULL
    `, [defaultOrganizer.id]);

    const updated = result.rowCount || 0;
    console.log(`Applied default organizer to ${updated} events`);
    
    return { updated };
  }

  private async getDefaultOrganizer(): Promise<any> {
    const result = await pool.query('SELECT * FROM organizers WHERE is_default = true');
    return result.rows[0] || null;
  }

  private async createLocalOrganizer(organizerData: any): Promise<any> {
    const result = await pool.query(`
      INSERT INTO organizers (
        name, email, phone, website, description, is_default,
        wordpress_organizer_id, wordpress_site_url, imported_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      organizerData.name,
      organizerData.email || null,
      organizerData.phone || null,
      organizerData.website || null,
      organizerData.description || null,
      organizerData.is_default || false,
      organizerData.wordpress_organizer_id || null,
      organizerData.wordpress_site_url || null,
      organizerData.imported_at || null
    ]);

    return result.rows[0];
  }

  async getAllOrganizers(): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM organizers 
      WHERE is_active = true 
      ORDER BY is_default DESC, name ASC
    `);
    return result.rows;
  }
}

// Additional interfaces for new functionality
interface WordPressVenue {
  id: number;
  venue: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface VenueImportResult {
  imported: number;
  matched: number;
  errors: VenueImportError[];
}

interface VenueImportError {
  venueId: number;
  name: string;
  error: string;
}

interface OrganizerImportResult {
  action: 'imported' | 'created' | 'exists';
  organizer: any;
  message: string;
}