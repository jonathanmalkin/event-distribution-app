import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs';
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

export class WordPressService {
  private siteUrl: string;
  private username: string;
  private password: string;
  private apiVersion: string = 'tribe/events/v1';

  constructor() {
    this.siteUrl = process.env.WORDPRESS_SITE_URL || '';
    this.username = process.env.WORDPRESS_USERNAME || '';
    this.password = process.env.WORDPRESS_PASSWORD || '';
    if (!this.siteUrl || !this.username || !this.password) {
      throw new Error('WordPress credentials not configured.');
    }
  }

  private getHeaders() {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.get(`${this.siteUrl}/wp-json/`, { headers: this.getHeaders() });
      return { success: response.status === 200, message: `Connected to ${response.data.name}` };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async createVenue(venueData: any): Promise<number> {
    const response = await axios.post(`${this.siteUrl}/wp-json/${this.apiVersion}/venues`, venueData, { headers: this.getHeaders() });
    return response.data.id;
  }

  async getOrCreateOrganizer(name: string = 'Kinky Coffee'): Promise<number> {
    try {
      const searchResponse = await axios.get(`${this.siteUrl}/wp-json/${this.apiVersion}/organizers?search=${encodeURIComponent(name)}`, { headers: this.getHeaders() });
      if (searchResponse.data.organizers && searchResponse.data.organizers.length > 0) {
        return searchResponse.data.organizers[0].id;
      }
      const createResponse = await axios.post(`${this.siteUrl}/wp-json/${this.apiVersion}/organizers`, { title: name }, { headers: this.getHeaders() });
      return createResponse.data.id;
    } catch (error) {
      throw new Error(`Could not get or create a WordPress organizer. ${error}`);
    }
  }

  async uploadImage(localImagePath: string, title: string): Promise<WordPressMediaResponse> {
    return new Promise((resolve, reject) => {
      const filename = path.basename(localImagePath);
      const mimeType = path.extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      const curlArgs = [
        '--request', 'POST',
        '--url', `${this.siteUrl}/wp-json/wp/v2/media`,
        '--user', `${this.username}:${this.password}`,
        '--header', `Content-Disposition: attachment; filename="${filename}"`,
        '--header', `Content-Type: ${mimeType}`,
        '--data-binary', `@${localImagePath}`
      ];
      const curl = spawn('curl', curlArgs, { shell: '/bin/bash' });
      let stdout = '', stderr = '';
      curl.stdout.on('data', (data) => stdout += data.toString());
      curl.stderr.on('data', (data) => stderr += data.toString());
      curl.on('close', (code) => {
        if (stderr) console.error('curl stderr:', stderr);
        if (code !== 0) return reject(new Error(`curl process exited with code ${code}.`));
        try {
          const jsonStartIndex = stdout.indexOf('{');
          const jsonString = jsonStartIndex !== -1 ? stdout.substring(jsonStartIndex) : stdout;
          const response = JSON.parse(jsonString);
          if (response.code) return reject(new Error(`WordPress API Error: ${stdout}`));
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse curl response: ${stdout}`));
        }
      });
    });
  }

  async createEvent(eventData: WordPressEventData): Promise<WordPressEventResponse> {
    const response = await axios.post(`${this.siteUrl}/wp-json/${this.apiVersion}/events`, eventData, { headers: this.getHeaders() });
    return response.data;
  }

  async setFeaturedImage(postId: number, mediaId: number): Promise<void> {
    await axios.post(`${this.siteUrl}/wp-json/${this.apiVersion}/events/${postId}`, { featured_media: mediaId }, { headers: this.getHeaders() });
  }
  
  convertEventData(eventData: any, venueId?: number, organizerId?: number, featuredMediaId?: number): WordPressEventData {
    const startDate = new Date(eventData.date_time);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    const wordpressEvent: WordPressEventData = {
      title: eventData.title || eventData.theme || 'Kinky Coffee Event',
      content: eventData.description || '',
      status: 'publish',
      start_date: startDate.toISOString().slice(0, 19),
      end_date: endDate.toISOString().slice(0, 19),
      all_day: false,
      timezone: 'America/Los_Angeles',
    };
    if (venueId) wordpressEvent.venue_id = venueId;
    if (organizerId) wordpressEvent.organizers = [{id: organizerId}];
    if (featuredMediaId) wordpressEvent.featured_media = featuredMediaId;
    return wordpressEvent;
  }
}

export default WordPressService;