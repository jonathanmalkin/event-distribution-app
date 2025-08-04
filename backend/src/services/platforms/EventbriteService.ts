import fetch from 'node-fetch';

interface EventbriteEventData {
  name: {
    html: string;
  };
  description: {
    html: string;
  };
  start: {
    timezone: string;
    utc: string;
  };
  end: {
    timezone: string;
    utc: string;
  };
  currency: string;
  online_event: boolean;
  venue_id?: string;
  logo_id?: string;
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  listed: boolean;
  shareable: boolean;
  invite_only: boolean;
  show_remaining: boolean;
  capacity?: number;
}

interface EventbriteVenueData {
  name: string;
  address: {
    address_1: string;
    address_2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
}

interface EventbriteEventResponse {
  id: string;
  name: {
    text: string;
    html: string;
  };
  description: {
    text: string;
    html: string;
  };
  url: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  created: string;
  changed: string;
  published: string;
  status: string;
  currency: string;
  online_event: boolean;
  venue_id?: string;
  venue?: any;
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  resource_uri: string;
  is_series: boolean;
  is_series_parent: boolean;
  inventory_type: string;
  source: string;
}

export class EventbriteService {
  private apiKey: string;
  private organizationId: string;
  private baseUrl: string = 'https://www.eventbriteapi.com/v3';

  constructor() {
    this.apiKey = process.env.EVENTBRITE_API_KEY || '';
    this.organizationId = process.env.EVENTBRITE_ORGANIZATION_ID || '';
    
    if (!this.apiKey) {
      throw new Error('Eventbrite credentials not configured. Please set EVENTBRITE_API_KEY environment variable.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create an Eventbrite Event
   */
  async createEvent(eventData: EventbriteEventData): Promise<{ id: string; url: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/events/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          event: eventData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const result = await response.json() as EventbriteEventResponse;
      
      return {
        id: result.id,
        url: result.url
      };
    } catch (error) {
      console.error('Error creating Eventbrite event:', error);
      throw error;
    }
  }

  /**
   * Create or Get Eventbrite Venue
   */
  async createVenue(venueData: EventbriteVenueData): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/organizations/${this.organizationId}/venues/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          venue: venueData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const result = await response.json() as { id: string };
      return result.id;
    } catch (error) {
      console.error('Error creating Eventbrite venue:', error);
      throw error;
    }
  }

  /**
   * Get Eventbrite Event Details
   */
  async getEventDetails(eventId: string): Promise<EventbriteEventResponse & { metrics: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const eventDetails = await response.json() as EventbriteEventResponse;
      
      // Get event attendees and sales data
      const metrics = await this.getEventMetrics(eventId);
      
      return {
        ...eventDetails,
        metrics
      };
    } catch (error) {
      console.error('Error fetching Eventbrite event details:', error);
      throw error;
    }
  }

  /**
   * Get Event Metrics (Attendees, Sales, etc.)
   */
  async getEventMetrics(eventId: string): Promise<any> {
    try {
      // Get attendee summary
      const attendeeResponse = await fetch(`${this.baseUrl}/events/${eventId}/attendees/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      let attendeeCount = 0;
      if (attendeeResponse.ok) {
        const attendeeData = await attendeeResponse.json() as { pagination: { object_count: number } };
        attendeeCount = attendeeData.pagination?.object_count || 0;
      }

      // Get orders summary
      const ordersResponse = await fetch(`${this.baseUrl}/events/${eventId}/orders/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      let orderCount = 0;
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json() as { pagination: { object_count: number } };
        orderCount = ordersData.pagination?.object_count || 0;
      }

      return {
        attendees: attendeeCount,
        orders: orderCount,
        registrations: attendeeCount, // Attendees = registrations for free events
        engagement: attendeeCount + orderCount
      };
    } catch (error) {
      console.error('Error fetching Eventbrite event metrics:', error);
      return {
        attendees: 0,
        orders: 0,
        registrations: 0,
        engagement: 0
      };
    }
  }

  /**
   * Update Eventbrite Event
   */
  async updateEvent(eventId: string, updateData: Partial<EventbriteEventData>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          event: updateData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating Eventbrite event:', error);
      throw error;
    }
  }

  /**
   * Publish Eventbrite Event
   */
  async publishEvent(eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/publish/`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error('Error publishing Eventbrite event:', error);
      throw error;
    }
  }

  /**
   * Cancel Eventbrite Event
   */
  async cancelEvent(eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}/cancel/`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      return true;
    } catch (error) {
      console.error('Error canceling Eventbrite event:', error);
      throw error;
    }
  }

  /**
   * Get Organization Events
   */
  async getOrganizationEvents(status?: string): Promise<EventbriteEventResponse[]> {
    try {
      let url = `${this.baseUrl}/organizations/${this.organizationId}/events/`;
      if (status) {
        url += `?status=${status}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`);
      }

      const result = await response.json() as { events: EventbriteEventResponse[] };
      return result.events || [];
    } catch (error) {
      console.error('Error fetching organization events:', error);
      throw error;
    }
  }

  /**
   * Test Eventbrite API Connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; userInfo?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me/`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: `Eventbrite API Error: ${error.error_description || error.error || 'Unknown error'}`
        };
      }

      const userInfo = await response.json();
      
      return {
        success: true,
        message: 'Eventbrite API connection successful',
        userInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert our event data to Eventbrite format
   */
  convertEventData(eventData: any): EventbriteEventData {
    const startDate = new Date(eventData.date_time);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
    
    return {
      name: {
        html: eventData.title || eventData.theme || 'Kinky Coffee Event'
      },
      description: {
        html: eventData.description || eventData.ai_generated_description || 'Join us for coffee, conversation, and community!'
      },
      start: {
        timezone: 'America/Los_Angeles', // TODO: Make configurable
        utc: startDate.toISOString()
      },
      end: {
        timezone: 'America/Los_Angeles',
        utc: endDate.toISOString()
      },
      currency: 'USD',
      online_event: false,
      listed: true,
      shareable: true,
      invite_only: false,
      show_remaining: false,
      capacity: 30 // Default capacity, make configurable
    };
  }

  /**
   * Convert venue data to Eventbrite format
   */
  convertVenueData(venueData: any): EventbriteVenueData {
    return {
      name: venueData.name,
      address: {
        address_1: venueData.street_address,
        city: venueData.city,
        region: venueData.state,
        postal_code: venueData.zip_code,
        country: 'US' // TODO: Make configurable
      }
    };
  }
}

export default EventbriteService;