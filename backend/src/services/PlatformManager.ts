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
  private wordpressService?: WordPressService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    try {
      if (process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_USERNAME) {
        this.wordpressService = new WordPressService();
      }
    } catch (error) {
      console.warn('WordPress service not initialized:', error);
    }
  }

  async distributeEvent(eventData: EventData, platforms: string[] = []): Promise<PlatformResult[]> {
    const results: PlatformResult[] = [];
    const platformsToProcess = platforms.length > 0 ? platforms : ['wordpress'];
    for (const platform of platformsToProcess) {
      try {
        const result = await this.postToPlatform(platform, eventData);
        results.push(result);
        await this.updateDistributionStatus(eventData.id, platform, result);
      } catch (error) {
        const errorResult: PlatformResult = { platform, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        results.push(errorResult);
        await this.updateDistributionStatus(eventData.id, platform, errorResult);
      }
    }
    return results;
  }

  private async postToPlatform(platform: string, eventData: EventData): Promise<PlatformResult> {
    if (platform.toLowerCase() === 'wordpress') {
      return this.postToWordPress(eventData);
    }
    throw new Error(`Unsupported platform: ${platform}`);
  }

  private async postToWordPress(eventData: EventData): Promise<PlatformResult> {
    if (!this.wordpressService) throw new Error('WordPress service not configured');

    let tempImagePath: string | undefined;
    try {
      const organizerId = await this.wordpressService.getOrCreateOrganizer();
      let venueId: number | undefined;
      if (eventData.venue) {
        venueId = await this.wordpressService.createVenue({
          venue: eventData.venue.name,
          address: eventData.venue.street_address,
          city: eventData.venue.city,
          state: eventData.venue.state,
          zip: eventData.venue.zip_code,
          country: 'US'
        });
      }

      let featuredMediaId: number | undefined;
      if (eventData.banner_image_url) {
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const extension = path.extname(new URL(eventData.banner_image_url).pathname) || '.jpg';
        tempImagePath = path.join(tempDir, `download-${Date.now()}${extension}`);
        const writer = fs.createWriteStream(tempImagePath);
        const response = await axios.get(eventData.banner_image_url, { responseType: 'stream' });
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        const mediaResponse = await this.wordpressService.uploadImage(tempImagePath, eventData.title || eventData.theme || 'Event Banner');
        featuredMediaId = mediaResponse.id;
      }

      const eventPayload = this.wordpressService.convertEventData(eventData, venueId, organizerId, undefined);
      const createdEvent = await this.wordpressService.createEvent(eventPayload);
      
      if (featuredMediaId) {
        await this.wordpressService.setFeaturedImage(createdEvent.id, featuredMediaId);
      }
      
      return {
        platform: 'wordpress',
        success: true,
        platformId: String(createdEvent.id),
        platformUrl: createdEvent.link,
        metrics: { featured_media_id: featuredMediaId, venue_id: venueId, organizer_id: organizerId, rsvp_url: createdEvent.link }
      };
    } catch (error) {
      throw new Error(`WordPress posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (tempImagePath && fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    }
  }

  private async updateDistributionStatus(eventId: number, platform: string, result: PlatformResult): Promise<void> {
    try {
      await pool.query(
        `UPDATE event_distributions SET status = $1, platform_event_id = $2, platform_url = $3, error_message = $4, metrics = $5, posted_at = CASE WHEN $1 = 'success' THEN NOW() ELSE posted_at END, last_synced = NOW() WHERE event_id = $6 AND platform = $7`,
        [result.success ? 'success' : 'failed', result.platformId || null, result.platformUrl || null, result.error || null, JSON.stringify(result.metrics || {}), eventId, platform]
      );
    } catch (error) {
      console.error('Error updating distribution status:', error);
    }
  }

  async testConnections(): Promise<{ [platform: string]: any }> {
    const results: { [platform: string]: any } = {};
    if (this.wordpressService) {
      results.wordpress = await this.wordpressService.testConnection();
    }
    return results;
  }
}

export default PlatformManager;