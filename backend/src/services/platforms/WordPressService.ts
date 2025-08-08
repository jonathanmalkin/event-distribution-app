import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';

interface WordPressEventData {
  title: string;
  content: string;
  status: 'publish' | 'draft';
  start_date: string;
  end_date: string;
  all_day: boolean;
  timezone: string;
  venue_id?: number;
  organizers?: { id: number }[];
  featured_media?: number;
}

interface WordPressMediaResponse {
  id: number;
  source_url: string;
  link: string;
}

interface WordPressEventResponse {
  id: number;
  link: string;
  slug: string;
  title: {
    rendered: string;
  };
}

interface WordPressVenueData {
  venue: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export class WordPressService {
  private baseURL: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseURL = process.env.WORDPRESS_SITE_URL || '';
    this.username = process.env.WORDPRESS_USERNAME || '';
    this.password = process.env.WORDPRESS_PASSWORD || '';
    
    if (!this.baseURL || !this.username || !this.password) {
      throw new Error('WordPress credentials not configured. Please set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD in environment variables.');
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async testConnection(): Promise<{ status: 'success' | 'error', message: string, user?: string }> {
    try {
      const response = await axios.get(`${this.baseURL}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': this.getAuthHeader()
        },
        timeout: 30000
      });
      
      return {
        status: 'success',
        message: 'WordPress connection successful',
        user: response.data.name
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        message: `WordPress connection failed: ${message}`
      };
    }
  }

  async uploadImage(imagePath: string, title?: string): Promise<WordPressMediaResponse> {
    try {
      console.log('Starting WordPress media upload for:', imagePath);
      
      if (!await fs.pathExists(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const form = new FormData();
      const imageStream = fs.createReadStream(imagePath);
      const fileName = path.basename(imagePath);
      
      form.append('file', imageStream, fileName);
      if (title) {
        form.append('title', title);
      }

      const response = await axios.post(
        `${this.baseURL}/wp-json/wp/v2/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': this.getAuthHeader(),
            'Connection': 'close' // Force fresh connection
          },
          timeout: 30000
        }
      );

      // WordPress sometimes returns string-wrapped JSON responses
      let mediaData = response.data;
      if (typeof mediaData === 'string') {
        const jsonStart = mediaData.indexOf('{');
        if (jsonStart !== -1) {
          mediaData = JSON.parse(mediaData.substring(jsonStart));
        } else {
          throw new Error('Invalid media response format from WordPress');
        }
      }
      
      console.log('WordPress media uploaded successfully. ID:', mediaData.id, 'URL:', mediaData.source_url);
      
      return {
        id: mediaData.id,
        source_url: mediaData.source_url,
        link: mediaData.link
      };
    } catch (error) {
      console.error('Error uploading media to WordPress:', error);
      throw new Error(`WordPress media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createEvent(eventData: WordPressEventData): Promise<WordPressEventResponse> {
    try {
      // Convert to WordPress post format for The Events Calendar plugin
      const postData = {
        title: eventData.title,
        content: eventData.content,
        status: eventData.status,
        meta: {
          _EventStartDate: eventData.start_date,
          _EventEndDate: eventData.end_date,
          _EventAllDay: eventData.all_day,
          _EventTimezone: eventData.timezone || 'America/Los_Angeles',
          ...(eventData.venue_id && { _EventVenueID: eventData.venue_id }),
          ...(eventData.organizers && { _EventOrganizerID: eventData.organizers.map(o => o.id) })
        },
        ...(eventData.featured_media && { featured_media: eventData.featured_media })
      };

      console.log('Creating WordPress event via posts API...');
      
      const response = await axios.post(
        `${this.baseURL}/wp-json/wp/v2/tribe_events`,
        postData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Connection': 'close' // Force fresh connection
          },
          timeout: 30000
        }
      );

      console.log('WordPress event created successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Error creating WordPress event:', error);
      throw new Error(`WordPress event creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setEventFeaturedImage(eventId: number, imageId: number): Promise<WordPressEventResponse> {
    try {
      console.log(`Setting featured image ${imageId} for WordPress event ${eventId}`);
      
      const response = await axios.post(
        `${this.baseURL}/wp-json/wp/v2/tribe_events/${eventId}`,
        {
          featured_media: imageId
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('WordPress featured image set successfully');
      return response.data;
    } catch (error) {
      console.error('Error setting WordPress featured image:', error);
      throw new Error(`WordPress featured image association failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  convertEventData(eventData: any, venueId?: number, organizerId?: number, featuredMediaId?: number): WordPressEventData {
    const startDate = new Date(eventData.date_time);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours duration

    return {
      title: eventData.theme || eventData.title || 'Event',
      content: eventData.ai_generated_description || eventData.description || '',
      status: 'publish',
      start_date: this.formatWordPressDate(startDate),
      end_date: this.formatWordPressDate(endDate),
      all_day: false,
      timezone: 'America/Los_Angeles',
      ...(venueId && { venue_id: venueId }),
      ...(organizerId && { organizers: [{ id: organizerId }] }),
      ...(featuredMediaId && { featured_media: featuredMediaId })
    };
  }

  private formatWordPressDate(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('.000Z', '');
  }

  async createVenue(venueData: WordPressVenueData): Promise<number> {
    try {
      console.log('Creating WordPress venue:', venueData.venue);
      
      const response = await axios.post(
        `${this.baseURL}/wp-json/tribe/events/v1/venues`,
        {
          venue: venueData.venue,
          address: venueData.address,
          city: venueData.city,
          state: venueData.state,
          zip: venueData.zip,
          country: venueData.country
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('WordPress venue created successfully:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('Error creating WordPress venue:', error);
      throw new Error(`WordPress venue creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrCreateOrganizer(localOrganizerData?: any): Promise<number> {
    try {
      // If we have local organizer data with WordPress ID, try to use it
      if (localOrganizerData?.wordpress_organizer_id) {
        console.log('Using existing WordPress organizer from local data:', localOrganizerData.wordpress_organizer_id);
        return localOrganizerData.wordpress_organizer_id;
      }

      // Try to get existing organizer first
      const response = await axios.get(
        `${this.baseURL}/wp-json/tribe/events/v1/organizers`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.length > 0) {
        console.log('Using existing WordPress organizer:', response.data[0].id);
        return response.data[0].id;
      }

      // Create organizer using local data if available, otherwise use default
      const organizerData = {
        organizer: localOrganizerData?.name || 'Event Organizer',
        email: localOrganizerData?.email || 'events@kinky.coffee',
        website: localOrganizerData?.website || this.baseURL
      };

      const createResponse = await axios.post(
        `${this.baseURL}/wp-json/tribe/events/v1/organizers`,
        organizerData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('WordPress organizer created successfully:', createResponse.data.id);
      return createResponse.data.id;
    } catch (error) {
      console.error('Error getting/creating WordPress organizer:', error);
      // Return null to continue without organizer rather than failing
      throw new Error(`WordPress organizer setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default WordPressService;