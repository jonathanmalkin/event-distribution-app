export interface Venue {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface PlatformStatusAttempt {
  status: 'pending' | 'success' | 'failed';
  platform_event_id?: string;
  error_message?: string;
  posted_at?: string;
  created_at: string;
}

// For list view - simplified status per platform
export interface PlatformStatusSummary {
  [platform: string]: {
    status: 'pending' | 'success' | 'failed';
    platform_event_id?: string;
    error_message?: string;
    posted_at?: string;
  };
}

// For detail view - full history per platform  
export interface PlatformStatusHistory {
  [platform: string]: PlatformStatusAttempt[];
}

export interface EventListItem {
  id: number;
  date_time: string;
  venue_id: number;
  theme?: string;
  description?: string;
  banner_image_url?: string;
  manual_theme_override?: string;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  created_at: string;
  updated_at: string;
  venue?: Venue;
  platform_status: PlatformStatusSummary;
  rsvp_count?: number;
}

export interface EventDetail {
  id: number;
  date_time: string;
  venue_id: number;
  theme?: string;
  description?: string;
  banner_image_url?: string;
  manual_theme_override?: string;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  created_at: string;
  updated_at: string;
  venue?: Venue;
  platform_status: PlatformStatusHistory;
  rsvp_count: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  time: string;
  venue: string;
  venue_name?: string;
  venue_city?: string;
  venue_state?: string;
  date_time?: string;
  theme?: string;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  rsvp_count: number;
}

// Legacy interface for backward compatibility
export interface Event {
  id?: number;
  date_time: string;
  venue_id: number;
  venue?: Venue;
  description?: string;
  manual_theme_override?: string;
  theme?: string;
  ai_generated_description?: string;
  banner_image_url?: string;
  status?: 'draft' | 'scheduled' | 'published' | 'cancelled';
}

export interface EventsResponse {
  events: EventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Filters {
  startDate?: string;
  endDate?: string;
  venue?: string;
  status?: string;
  search?: string;
  sort?: string;
}