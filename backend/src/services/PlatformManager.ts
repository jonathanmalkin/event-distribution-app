import FacebookService from './platforms/FacebookService';
import InstagramService from './platforms/InstagramService';
import EventbriteService from './platforms/EventbriteService';
import pool from '../config/database';

interface PlatformResult {
  platform: string;
  success: boolean;
  platformId?: string;
  platformUrl?: string;
  error?: string;
  metrics?: any;
}

interface EventData {
  id: number;
  title?: string;
  theme?: string;
  description?: string;
  ai_generated_description?: string;
  date_time: string;
  banner_image_url?: string;
  venue?: {
    id: number;
    name: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

export class PlatformManager {
  private facebookService?: FacebookService;
  private instagramService?: InstagramService;
  private eventbriteService?: EventbriteService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    try {
      if (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID) {
        this.facebookService = new FacebookService();
      }
    } catch (error) {
      console.warn('Facebook service not initialized:', error);
    }

    try {
      if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
        this.instagramService = new InstagramService();
      }
    } catch (error) {
      console.warn('Instagram service not initialized:', error);
    }

    try {
      if (process.env.EVENTBRITE_API_KEY) {
        this.eventbriteService = new EventbriteService();
      }
    } catch (error) {
      console.warn('Eventbrite service not initialized:', error);
    }
  }

  /**
   * Distribute event to all configured platforms
   */
  async distributeEvent(eventData: EventData, platforms: string[] = []): Promise<PlatformResult[]> {
    const results: PlatformResult[] = [];
    const platformsToProcess = platforms.length > 0 ? platforms : ['facebook', 'instagram', 'eventbrite'];

    for (const platform of platformsToProcess) {
      try {
        const result = await this.postToPlatform(platform, eventData);
        results.push(result);
        
        // Update database with result
        await this.updateDistributionStatus(eventData.id, platform, result);
      } catch (error) {
        const errorResult: PlatformResult = {
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        
        // Update database with error
        await this.updateDistributionStatus(eventData.id, platform, errorResult);
      }
    }

    return results;
  }

  /**
   * Post to specific platform
   */
  private async postToPlatform(platform: string, eventData: EventData): Promise<PlatformResult> {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return await this.postToFacebook(eventData);
      
      case 'instagram':
        return await this.postToInstagram(eventData);
      
      case 'eventbrite':
        return await this.postToEventbrite(eventData);
      
      case 'meetup':
        return await this.postToMeetup(eventData);
      
      case 'fetlife':
        return await this.postToFetLife(eventData);
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Post event to Facebook
   */
  private async postToFacebook(eventData: EventData): Promise<PlatformResult> {
    if (!this.facebookService) {
      throw new Error('Facebook service not configured');
    }

    try {
      // Create Facebook Page Post (event creation requires special permissions)
      const postCaption = this.generateFacebookPost(eventData);
      const postResult = await this.facebookService.createPost({
        message: postCaption
        // Note: Picture/link parameters require ownership of the domain, so we'll just post text for now
      });

      return {
        platform: 'facebook',
        success: true,
        platformId: postResult.id,
        platformUrl: postResult.url,
        metrics: {
          post_id: postResult.id,
          post_url: postResult.url
        }
      };
    } catch (error) {
      throw new Error(`Facebook posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post event to Instagram
   */
  private async postToInstagram(eventData: EventData): Promise<PlatformResult> {
    if (!this.instagramService) {
      throw new Error('Instagram service not configured');
    }

    if (!eventData.banner_image_url) {
      throw new Error('Instagram requires an image - banner_image_url is missing');
    }

    try {
      // Validate image URL
      const isValidImage = await this.instagramService.validateImageUrl(eventData.banner_image_url);
      if (!isValidImage) {
        throw new Error('Invalid image URL for Instagram');
      }

      const caption = this.instagramService.generateEventCaption(eventData);
      
      const result = await this.instagramService.createPost({
        image_url: eventData.banner_image_url,
        caption: caption
      });

      return {
        platform: 'instagram',
        success: true,
        platformId: result.id,
        platformUrl: result.url
      };
    } catch (error) {
      throw new Error(`Instagram posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post event to Eventbrite
   */
  private async postToEventbrite(eventData: EventData): Promise<PlatformResult> {
    if (!this.eventbriteService) {
      throw new Error('Eventbrite service not configured');
    }

    try {
      let venueId = undefined;
      
      // Create venue if we have venue data (fallback to online event if venue creation fails)
      if (eventData.venue) {
        try {
          const venueData = this.eventbriteService.convertVenueData(eventData.venue);
          venueId = await this.eventbriteService.createVenue(venueData);
        } catch (venueError) {
          console.warn('Venue creation failed, creating online event instead:', venueError);
          // Will create as online event without venue
        }
      }

      // Create event
      const eventbriteEventData = this.eventbriteService.convertEventData(eventData);
      if (venueId) {
        eventbriteEventData.venue_id = venueId;
        eventbriteEventData.online_event = false;
      } else {
        eventbriteEventData.online_event = true; // Make it an online event if no venue
      }

      const result = await this.eventbriteService.createEvent(eventbriteEventData);

      // Create ticket class for the event
      await this.eventbriteService.createTicketClass(result.id);

      // Publish the event
      await this.eventbriteService.publishEvent(result.id);

      return {
        platform: 'eventbrite',
        success: true,
        platformId: result.id,
        platformUrl: result.url,
        metrics: {
          venue_id: venueId
        }
      };
    } catch (error) {
      throw new Error(`Eventbrite posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post event to Meetup (placeholder - API limitations)
   */
  private async postToMeetup(eventData: EventData): Promise<PlatformResult> {
    // Meetup API has been significantly limited
    // This would require manual creation or alternative approach
    throw new Error('Meetup integration not yet implemented due to API limitations');
  }

  /**
   * Post event to FetLife (placeholder - requires web automation)
   */
  private async postToFetLife(eventData: EventData): Promise<PlatformResult> {
    // FetLife requires web automation with Puppeteer
    // This would include the specific location details for the trusted community
    throw new Error('FetLife integration not yet implemented - requires web automation');
  }

  /**
   * Sync event details from platforms
   */
  async syncEventFromPlatforms(eventId: number): Promise<void> {
    try {
      // Get existing distribution records
      const query = `
        SELECT platform, platform_event_id 
        FROM event_distributions 
        WHERE event_id = $1 AND status = 'success' AND platform_event_id IS NOT NULL
      `;
      const result = await pool.query(query, [eventId]);

      for (const row of result.rows) {
        await this.syncFromPlatform(eventId, row.platform, row.platform_event_id);
      }
    } catch (error) {
      console.error('Error syncing event from platforms:', error);
      throw error;
    }
  }

  /**
   * Sync from specific platform
   */
  private async syncFromPlatform(eventId: number, platform: string, platformEventId: string): Promise<void> {
    try {
      let metrics = {};

      switch (platform.toLowerCase()) {
        case 'facebook':
          if (this.facebookService) {
            const details = await this.facebookService.getEventDetails(platformEventId);
            metrics = details.metrics;
          }
          break;

        case 'instagram':
          if (this.instagramService) {
            const details = await this.instagramService.getMediaDetails(platformEventId);
            metrics = details.metrics;
          }
          break;

        case 'eventbrite':
          if (this.eventbriteService) {
            const details = await this.eventbriteService.getEventDetails(platformEventId);
            metrics = details.metrics;
          }
          break;
      }

      // Update metrics in database
      await this.updatePlatformMetrics(eventId, platform, metrics);
    } catch (error) {
      console.error(`Error syncing from ${platform}:`, error);
    }
  }

  /**
   * Update distribution status in database
   */
  private async updateDistributionStatus(eventId: number, platform: string, result: PlatformResult): Promise<void> {
    try {
      const updateQuery = `
        UPDATE event_distributions 
        SET 
          status = $1,
          platform_event_id = $2,
          platform_url = $3,
          error_message = $4,
          metrics = $5,
          posted_at = CASE WHEN $1 = 'success' THEN NOW() ELSE posted_at END,
          last_synced = NOW()
        WHERE event_id = $6 AND platform = $7
      `;

      await pool.query(updateQuery, [
        result.success ? 'success' : 'failed',
        result.platformId || null,
        result.platformUrl || null,
        result.error || null,
        JSON.stringify(result.metrics || {}),
        eventId,
        platform
      ]);
    } catch (error) {
      console.error('Error updating distribution status:', error);
    }
  }

  /**
   * Update platform metrics
   */
  private async updatePlatformMetrics(eventId: number, platform: string, metrics: any): Promise<void> {
    try {
      const updateQuery = `
        UPDATE event_distributions 
        SET metrics = $1, last_synced = NOW()
        WHERE event_id = $2 AND platform = $3
      `;

      await pool.query(updateQuery, [
        JSON.stringify(metrics),
        eventId,
        platform
      ]);
    } catch (error) {
      console.error('Error updating platform metrics:', error);
    }
  }

  /**
   * Generate Facebook post content
   */
  private generateFacebookPost(eventData: EventData): string {
    const eventDate = new Date(eventData.date_time);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let post = `🌟 ${eventData.title || eventData.theme} 🌟\n\n`;
    
    if (eventData.description || eventData.ai_generated_description) {
      post += `${eventData.description || eventData.ai_generated_description}\n\n`;
    }

    post += `📅 ${formattedDate}\n⏰ ${formattedTime}\n`;
    
    if (eventData.venue) {
      post += `📍 ${eventData.venue.city}, ${eventData.venue.state}\n`;
    }

    post += `\n☕ Join us for coffee, conversation, and community!\n`;
    post += `💌 RSVP for specific location details\n\n`;
    post += `#KinkyCoffee #Community #Coffee #Events`;

    return post;
  }

  /**
   * Import events from platforms into our database (past year only)
   */
  async importEventsFromPlatforms(platforms: string[] = []): Promise<{ imported: number; errors: string[]; note: string }> {
    const platformsToProcess = platforms.length > 0 ? platforms : ['eventbrite'];
    let imported = 0;
    const errors: string[] = [];

    for (const platform of platformsToProcess) {
      try {
        const importedCount = await this.importFromPlatform(platform);
        imported += importedCount;
      } catch (error) {
        errors.push(`${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { 
      imported, 
      errors,
      note: 'Only events from the past year are imported to keep data relevant and manageable.'
    };
  }

  /**
   * Import events from a specific platform
   */
  private async importFromPlatform(platform: string): Promise<number> {
    switch (platform.toLowerCase()) {
      case 'eventbrite':
        return await this.importFromEventbrite();
      
      case 'facebook':
        return await this.importFromFacebook();
      
      case 'instagram':
        return await this.importFromInstagram();
      
      default:
        throw new Error(`Import not supported for platform: ${platform}`);
    }
  }

  /**
   * Import events from Eventbrite (past year only)
   */
  private async importFromEventbrite(): Promise<number> {
    if (!this.eventbriteService) {
      throw new Error('Eventbrite service not configured');
    }

    try {
      // Get all events from Eventbrite
      const eventbriteEvents = await this.eventbriteService.getOrganizationEvents();
      let imported = 0;
      let skippedOld = 0;
      let skippedExisting = 0;

      // Filter events to only include those from the past year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      for (const eventbriteEvent of eventbriteEvents) {
        try {
          // Check if event is within the past year
          const eventDate = new Date(eventbriteEvent.start.utc);
          if (eventDate < oneYearAgo) {
            skippedOld++;
            continue;
          }

          // Check if event already exists in our database
          // First check by platform_event_id in distributions
          const existingEventQuery1 = `
            SELECT e.id FROM events e
            JOIN event_distributions ed ON e.id = ed.event_id
            WHERE ed.platform = 'eventbrite' AND ed.platform_event_id = $1
          `;
          const existingResult1 = await pool.query(existingEventQuery1, [eventbriteEvent.id]);

          if (existingResult1.rows.length > 0) {
            skippedExisting++;
            continue;
          }

          // Also check by theme and date to prevent duplicates when distribution records fail
          const eventData = this.convertEventbriteEventToLocal(eventbriteEvent);
          const existingEventQuery2 = `
            SELECT id FROM events 
            WHERE theme = $1 AND date_time = $2
          `;
          const existingResult2 = await pool.query(existingEventQuery2, [eventData.theme, eventData.date_time]);

          if (existingResult2.rows.length > 0) {
            skippedExisting++;
            continue;
          }

          // Insert event into our database
          const eventId = await this.insertEventIntoDatabase(eventData);
          
          // Create distribution record
          await this.createDistributionRecord(eventId, 'eventbrite', eventbriteEvent.id, eventbriteEvent.url);
          
          // Get and store metrics
          const metrics = await this.eventbriteService.getEventMetrics(eventbriteEvent.id);
          await this.updatePlatformMetrics(eventId, 'eventbrite', metrics);

          imported++;
          console.log(`✅ Imported event: ${eventbriteEvent.name.text}`);
        } catch (eventError) {
          console.error(`❌ Error importing event ${eventbriteEvent.id}:`, eventError);
        }
      }

      console.log(`📊 Import complete: ${imported} imported, ${skippedOld} too old, ${skippedExisting} already exist`);
      return imported;
    } catch (error) {
      throw new Error(`Eventbrite import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import events from Facebook (placeholder)
   */
  private async importFromFacebook(): Promise<number> {
    throw new Error('Facebook event import not yet implemented');
  }

  /**
   * Import events from Instagram (placeholder)
   */
  private async importFromInstagram(): Promise<number> {
    throw new Error('Instagram post import not yet implemented');
  }

  /**
   * Convert Eventbrite event to our local format
   */
  private convertEventbriteEventToLocal(eventbriteEvent: any): any {
    return {
      title: eventbriteEvent.name.text,
      theme: eventbriteEvent.name.text,
      description: eventbriteEvent.description?.text || '',
      ai_generated_description: eventbriteEvent.description?.text || '',
      date_time: eventbriteEvent.start.utc,
      banner_image_url: null, // Eventbrite doesn't provide banner images in the basic response
      venue_data: eventbriteEvent.venue ? {
        name: eventbriteEvent.venue.name || 'Online Event',
        street_address: eventbriteEvent.venue.address?.address_1 || '',
        city: eventbriteEvent.venue.address?.city || '',
        state: eventbriteEvent.venue.address?.region || '',
        zip_code: eventbriteEvent.venue.address?.postal_code || ''
      } : null
    };
  }

  /**
   * Insert event into database
   */
  private async insertEventIntoDatabase(eventData: any): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert venue if provided
      let venueId = null;
      if (eventData.venue_data) {
        const venueQuery = `
          INSERT INTO venues (name, street_address, city, state, zip_code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id
        `;
        const venueResult = await client.query(venueQuery, [
          eventData.venue_data.name,
          eventData.venue_data.street_address,
          eventData.venue_data.city,
          eventData.venue_data.state,
          eventData.venue_data.zip_code
        ]);
        venueId = venueResult.rows[0].id;
      }

      // Insert event
      const eventQuery = `
        INSERT INTO events (
          title, theme, description, ai_generated_description, 
          date_time, banner_image_url, venue_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `;
      const eventResult = await client.query(eventQuery, [
        eventData.title,
        eventData.theme,
        eventData.description,
        eventData.ai_generated_description,
        eventData.date_time,
        eventData.banner_image_url,
        venueId
      ]);

      await client.query('COMMIT');
      return eventResult.rows[0].id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create distribution record for imported event
   */
  private async createDistributionRecord(eventId: number, platform: string, platformEventId: string, platformUrl: string): Promise<void> {
    const query = `
      INSERT INTO event_distributions (
        event_id, platform, status, platform_event_id, platform_url, 
        posted_at, last_synced, created_at, updated_at
      )
      VALUES ($1, $2, 'published', $3, $4, NOW(), NOW(), NOW(), NOW())
    `;
    
    await pool.query(query, [eventId, platform, platformEventId, platformUrl]);
  }

  /**
   * Test all platform connections
   */
  async testConnections(): Promise<{ [platform: string]: any }> {
    const results: { [platform: string]: any } = {};

    if (this.facebookService) {
      try {
        results.facebook = await this.facebookService.testConnection();
      } catch (error) {
        results.facebook = { success: false, message: 'Service not configured' };
      }
    } else {
      results.facebook = { success: false, message: 'Service not configured' };
    }

    if (this.instagramService) {
      try {
        results.instagram = await this.instagramService.testConnection();
      } catch (error) {
        results.instagram = { success: false, message: 'Service not configured' };
      }
    } else {
      results.instagram = { success: false, message: 'Service not configured' };
    }

    if (this.eventbriteService) {
      try {
        results.eventbrite = await this.eventbriteService.testConnection();
      } catch (error) {
        results.eventbrite = { success: false, message: 'Service not configured' };
      }
    } else {
      results.eventbrite = { success: false, message: 'Service not configured' };
    }

    return results;
  }
}

export default PlatformManager;