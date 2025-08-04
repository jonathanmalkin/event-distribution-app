import fetch from 'node-fetch';

interface InstagramPostData {
  image_url: string;
  caption: string;
  location_id?: string;
}

interface InstagramMediaResponse {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export class InstagramService {
  private accessToken: string;
  private instagramBusinessAccountId: string;
  private apiVersion: string = 'v18.0';
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    if (!this.accessToken || !this.instagramBusinessAccountId) {
      throw new Error('Instagram credentials not configured. Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID environment variables.');
    }
  }

  /**
   * Create an Instagram Post
   */
  async createPost(postData: InstagramPostData): Promise<{ id: string; url: string }> {
    try {
      // Step 1: Create media container
      const containerResponse = await fetch(
        `${this.baseUrl}/${this.instagramBusinessAccountId}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: postData.image_url,
            caption: postData.caption,
            location_id: postData.location_id,
            access_token: this.accessToken
          })
        }
      );

      if (!containerResponse.ok) {
        const error = await containerResponse.json();
        throw new Error(`Instagram API Error (Container): ${error.error?.message || 'Unknown error'}`);
      }

      const containerResult = await containerResponse.json() as { id: string };
      
      // Step 2: Publish the media container
      const publishResponse = await fetch(
        `${this.baseUrl}/${this.instagramBusinessAccountId}/media_publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: containerResult.id,
            access_token: this.accessToken
          })
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Instagram API Error (Publish): ${error.error?.message || 'Unknown error'}`);
      }

      const publishResult = await publishResponse.json() as { id: string };
      
      // Get the permalink for the published post
      const mediaDetails = await this.getMediaDetails(publishResult.id);
      
      return {
        id: publishResult.id,
        url: mediaDetails.permalink
      };
    } catch (error) {
      console.error('Error creating Instagram post:', error);
      throw error;
    }
  }

  /**
   * Get Instagram Media Details and Metrics
   */
  async getMediaDetails(mediaId: string): Promise<InstagramMediaResponse & { metrics: any }> {
    try {
      const fields = [
        'id', 'media_type', 'media_url', 'permalink', 'caption',
        'timestamp', 'like_count', 'comments_count'
      ].join(',');

      const response = await fetch(
        `${this.baseUrl}/${mediaId}?fields=${fields}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const mediaDetails = await response.json() as InstagramMediaResponse;
      
      return {
        ...mediaDetails,
        metrics: {
          likes: mediaDetails.like_count || 0,
          comments: mediaDetails.comments_count || 0,
          engagement: (mediaDetails.like_count || 0) + (mediaDetails.comments_count || 0)
        }
      };
    } catch (error) {
      console.error('Error fetching Instagram media details:', error);
      throw error;
    }
  }

  /**
   * Get Instagram Business Account Info
   */
  async getAccountInfo(): Promise<any> {
    try {
      const fields = [
        'id', 'username', 'name', 'biography', 'website',
        'followers_count', 'follows_count', 'media_count'
      ].join(',');

      const response = await fetch(
        `${this.baseUrl}/${this.instagramBusinessAccountId}?fields=${fields}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram API Error: ${error.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Instagram account info:', error);
      throw error;
    }
  }

  /**
   * Get Recent Media Posts
   */
  async getRecentMedia(limit: number = 10): Promise<InstagramMediaResponse[]> {
    try {
      const fields = [
        'id', 'media_type', 'media_url', 'permalink', 'caption',
        'timestamp', 'like_count', 'comments_count'
      ].join(',');

      const response = await fetch(
        `${this.baseUrl}/${this.instagramBusinessAccountId}/media?fields=${fields}&limit=${limit}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as { data: InstagramMediaResponse[] };
      return result.data || [];
    } catch (error) {
      console.error('Error fetching Instagram recent media:', error);
      throw error;
    }
  }

  /**
   * Search Instagram Locations (for location tagging)
   */
  async searchLocations(query: string): Promise<any[]> {
    try {
      // Note: This requires additional permissions and may not be available for all apps
      const response = await fetch(
        `${this.baseUrl}/search?type=place&q=${encodeURIComponent(query)}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as { data: any[] };
      return result.data || [];
    } catch (error) {
      console.error('Error searching Instagram locations:', error);
      return []; // Return empty array if location search fails
    }
  }

  /**
   * Test Instagram API Connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; accountInfo?: any }> {
    try {
      const accountInfo = await this.getAccountInfo();
      
      return {
        success: true,
        message: 'Instagram API connection successful',
        accountInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate Instagram Post Caption for Event
   */
  generateEventCaption(eventData: any): string {
    const {
      title,
      theme,
      description,
      date_time,
      venue
    } = eventData;

    const eventDate = new Date(date_time);
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

    let caption = `🌟 ${title || theme} 🌟\n\n`;
    
    if (description) {
      // Truncate description for Instagram (max 2200 characters)
      const truncatedDesc = description.length > 500 
        ? description.substring(0, 500) + '...' 
        : description;
      caption += `${truncatedDesc}\n\n`;
    }

    caption += `📅 ${formattedDate}\n⏰ ${formattedTime}\n`;
    
    if (venue) {
      caption += `📍 ${venue.name || venue}\n`;
    }

    caption += `\n☕ Join us for coffee, conversation, and community!\n`;
    caption += `💌 RSVP for location details\n\n`;
    caption += `#KinkyCoffee #Community #Coffee #Events #AdultEducation #SafeSpace #BDSM #Kink #Connection`;

    return caption;
  }

  /**
   * Validate Image URL for Instagram
   */
  async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type');
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      
      return allowedTypes.some(type => contentType?.includes(type));
    } catch (error) {
      console.error('Error validating image URL:', error);
      return false;
    }
  }
}

export default InstagramService;