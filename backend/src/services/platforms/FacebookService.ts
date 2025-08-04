import fetch from 'node-fetch';

interface FacebookEventData {
  name: string;
  description: string;
  start_time: string;
  end_time?: string;
  location?: string;
  cover_url?: string;
  online_event?: boolean;
}

interface FacebookPostData {
  message: string;
  link?: string;
  picture?: string;
}

interface FacebookEventResponse {
  id: string;
  name: string;
  description: string;
  start_time: string;
  attending_count?: number;
  interested_count?: number;
  maybe_count?: number;
  cover?: {
    source: string;
  };
}

export class FacebookService {
  private accessToken: string;
  private pageId: string;
  private apiVersion: string = 'v18.0';
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
    this.pageId = process.env.FACEBOOK_PAGE_ID || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    if (!this.accessToken || !this.pageId) {
      throw new Error('Facebook credentials not configured. Please set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID environment variables.');
    }
  }

  /**
   * Create a Facebook Event
   */
  async createEvent(eventData: FacebookEventData): Promise<{ id: string; url: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.pageId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          access_token: this.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as { id: string };
      
      return {
        id: result.id,
        url: `https://www.facebook.com/events/${result.id}`
      };
    } catch (error) {
      console.error('Error creating Facebook event:', error);
      throw error;
    }
  }

  /**
   * Create a Facebook Page Post
   */
  async createPost(postData: FacebookPostData): Promise<{ id: string; url: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.pageId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          access_token: this.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as { id: string };
      const postId = result.id.split('_')[1]; // Extract post ID from page_postId format
      
      return {
        id: result.id,
        url: `https://www.facebook.com/${this.pageId}/posts/${postId}`
      };
    } catch (error) {
      console.error('Error creating Facebook post:', error);
      throw error;
    }
  }

  /**
   * Get Facebook Event Details and Metrics
   */
  async getEventDetails(eventId: string): Promise<FacebookEventResponse & { metrics: any }> {
    try {
      const fields = [
        'id', 'name', 'description', 'start_time', 'end_time',
        'attending_count', 'interested_count', 'maybe_count',
        'cover', 'place', 'updated_time'
      ].join(',');

      const response = await fetch(
        `${this.baseUrl}/${eventId}?fields=${fields}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const eventDetails = await response.json() as FacebookEventResponse;
      
      return {
        ...eventDetails,
        metrics: {
          attending: eventDetails.attending_count || 0,
          interested: eventDetails.interested_count || 0,
          maybe: eventDetails.maybe_count || 0,
          total_engagement: (eventDetails.attending_count || 0) + 
                           (eventDetails.interested_count || 0) + 
                           (eventDetails.maybe_count || 0)
        }
      };
    } catch (error) {
      console.error('Error fetching Facebook event details:', error);
      throw error;
    }
  }

  /**
   * Get Facebook Post Metrics
   */
  async getPostMetrics(postId: string): Promise<any> {
    try {
      const fields = [
        'id', 'message', 'created_time', 'updated_time',
        'likes.summary(true)', 'comments.summary(true)', 'shares'
      ].join(',');

      const response = await fetch(
        `${this.baseUrl}/${postId}?fields=${fields}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const postDetails = await response.json() as any;
      
      return {
        likes: postDetails.likes?.summary?.total_count || 0,
        comments: postDetails.comments?.summary?.total_count || 0,
        shares: postDetails.shares?.count || 0,
        engagement: (postDetails.likes?.summary?.total_count || 0) +
                   (postDetails.comments?.summary?.total_count || 0) +
                   (postDetails.shares?.count || 0)
      };
    } catch (error) {
      console.error('Error fetching Facebook post metrics:', error);
      throw error;
    }
  }

  /**
   * Test Facebook API Connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; pageInfo?: any }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.pageId}?fields=id,name,followers_count&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: `Facebook API Error: ${error.error?.message || 'Unknown error'}`
        };
      }

      const pageInfo = await response.json();
      
      return {
        success: true,
        message: 'Facebook API connection successful',
        pageInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update Facebook Event
   */
  async updateEvent(eventId: string, updateData: Partial<FacebookEventData>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updateData,
          access_token: this.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating Facebook event:', error);
      throw error;
    }
  }

  /**
   * Delete Facebook Event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting Facebook event:', error);
      throw error;
    }
  }
}

export default FacebookService;