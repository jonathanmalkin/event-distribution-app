import WordPressService from './platforms/WordPressService';
import pool from '../config/database';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
  organizer_id?: number;
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
  private wordpressService?: WordPressService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    try {
      if (process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_USERNAME) {
        this.wordpressService = new WordPressService();
        console.log('WordPress service initialized');
      } else {
        console.log('WordPress service not initialized - missing credentials');
      }
    } catch (error) {
      console.warn('WordPress service initialization failed:', error);
    }
  }

  async distributeEvent(eventData: EventData, platforms: string[] = []): Promise<PlatformResult[]> {
    const results: PlatformResult[] = [];
    const platformsToProcess = platforms.length > 0 ? platforms : [];

    if (platformsToProcess.length === 0) {
      console.log('No platforms specified for distribution');
      return results;
    }

    for (const platform of platformsToProcess) {
      try {
        const result = await this.postToPlatform(platform, eventData);
        results.push(result);
        await this.updateDistributionStatus(eventData.id, platform, result);
      } catch (error) {
        const errorResult: PlatformResult = { 
          platform, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        results.push(errorResult);
        await this.updateDistributionStatus(eventData.id, platform, errorResult);
      }
    }
    
    return results;
  }

  private async postToPlatform(platform: string, eventData: EventData): Promise<PlatformResult> {
    switch (platform.toLowerCase()) {
      case 'wordpress':
        return this.postToWordPress(eventData);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async postToWordPress(eventData: EventData): Promise<PlatformResult> {
    if (!this.wordpressService) {
      throw new Error('WordPress service not configured');
    }

    let tempImagePath: string | undefined;
    let featuredImageData: { id: number; url: string } | undefined;

    try {
      // Step 1: Get local organizer data and create/get WordPress organizer
      let organizerId: number | undefined;
      let localOrganizerData: any = null;
      
      try {
        // Get local organizer data if event has organizer_id
        if (eventData.organizer_id) {
          const organizerResult = await pool.query('SELECT * FROM organizers WHERE id = $1', [eventData.organizer_id]);
          localOrganizerData = organizerResult.rows[0] || null;
        } else {
          // Get default organizer
          const defaultOrganizerResult = await pool.query('SELECT * FROM organizers WHERE is_default = true');
          localOrganizerData = defaultOrganizerResult.rows[0] || null;
        }

        organizerId = await this.wordpressService.getOrCreateOrganizer(localOrganizerData);
        console.log('WordPress organizer successfully created/retrieved with ID:', organizerId);
      } catch (error) {
        console.error('Critical error - Failed to get/create WordPress organizer:', error);
        console.log('Event will be created without organizer specification');
        // Don't throw - continue without organizer but log the issue
      }

      // Step 2: Create venue if provided
      let venueId: number | undefined;
      if (eventData.venue) {
        try {
          venueId = await this.wordpressService.createVenue({
            venue: eventData.venue.name,
            address: eventData.venue.street_address,
            city: eventData.venue.city,
            state: eventData.venue.state,
            zip: eventData.venue.zip_code,
            country: 'US'
          });
          console.log('WordPress venue created with ID:', venueId);
        } catch (error) {
          console.error('Critical error - Failed to create WordPress venue:', error);
          console.log('Event will be created without venue specification');
          // Don't throw - continue without venue but log the issue
        }
      }

      // Step 3: Handle featured image upload if banner image URL is provided
      if (eventData.banner_image_url) {
        try {
          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, '..', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // Download image to temporary file
          const extension = path.extname(new URL(eventData.banner_image_url).pathname) || '.jpg';
          tempImagePath = path.join(tempDir, `download-${Date.now()}${extension}`);
          
          console.log('Downloading image for WordPress upload:', eventData.banner_image_url);
          const response = await axios.get(eventData.banner_image_url, { 
            responseType: 'stream',
            timeout: 30000
          });
          
          const writer = fs.createWriteStream(tempImagePath);
          response.data.pipe(writer);
          
          await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          // Upload to WordPress
          const mediaResponse = await this.wordpressService.uploadImage(
            tempImagePath, 
            eventData.title || eventData.theme || 'Event Banner'
          );
          
          featuredImageData = {
            id: mediaResponse.id,
            url: mediaResponse.source_url
          };

          console.log('Image uploaded to WordPress with ID:', featuredImageData.id);

          // Critical delay to prevent connection reuse issues
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.warn('Failed to upload featured image to WordPress, continuing without:', error);
        }
      }

      // Step 4: Create the WordPress event
      const eventPayload = this.wordpressService.convertEventData(
        eventData, 
        venueId, 
        organizerId, 
        featuredImageData?.id
      );
      
      const createdEvent = await this.wordpressService.createEvent(eventPayload);

      // Step 5: Associate featured image if it wasn't included in initial creation
      if (featuredImageData && !eventPayload.featured_media) {
        try {
          await this.wordpressService.setEventFeaturedImage(createdEvent.id, featuredImageData.id);
          console.log('Featured image associated with WordPress event successfully');
        } catch (error) {
          console.warn('Failed to associate featured image with WordPress event:', error);
        }
      }

      const metrics = {
        venue_id: venueId,
        organizer_id: organizerId,
        featured_image_id: featuredImageData?.id,
        featured_image_url: featuredImageData?.url,
        wordpress_event_url: createdEvent.link
      };

      return {
        platform: 'wordpress',
        success: true,
        platformId: String(createdEvent.id),
        platformUrl: createdEvent.link,
        metrics
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('WordPress posting failed:', errorMessage);
      throw new Error(`WordPress posting failed: ${errorMessage}`);
    } finally {
      // Clean up temporary image file
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
          console.log('Temporary image file cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary image file:', cleanupError);
        }
      }
    }
  }

  private async updateDistributionStatus(eventId: number, platform: string, result: PlatformResult): Promise<void> {
    try {
      await pool.query(
        `UPDATE event_distributions SET status = $1, platform_event_id = $2, platform_url = $3, error_message = $4, metrics = $5, posted_at = CASE WHEN $1 = 'success' THEN NOW() ELSE posted_at END, last_synced = NOW() WHERE event_id = $6 AND platform = $7`,
        [
          result.success ? 'success' : 'failed', 
          result.platformId ? String(result.platformId) : null, 
          result.platformUrl || null, 
          result.error || null, 
          JSON.stringify(result.metrics || {}), 
          eventId, 
          platform
        ]
      );
    } catch (error) {
      console.error('Error updating distribution status:', error);
    }
  }

  async testConnections(): Promise<{ [platform: string]: any }> {
    const results: { [platform: string]: any } = {};
    
    if (this.wordpressService) {
      try {
        const wpResult = await this.wordpressService.testConnection();
        results.wordpress = wpResult;
      } catch (error) {
        results.wordpress = {
          status: 'error',
          message: `WordPress test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    } else {
      results.wordpress = {
        status: 'error',
        message: 'WordPress service not initialized'
      };
    }
    
    return results;
  }
}

export default PlatformManager;