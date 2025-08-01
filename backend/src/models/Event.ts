export interface Venue {
  id?: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Event {
  id?: number;
  title?: string;
  theme?: string;
  description?: string;
  date_time: Date;
  venue_id: number; // Now required since we don't have general_area
  banner_image_url?: string;
  ai_generated_theme?: string;
  ai_generated_description?: string;
  manual_theme_override?: string;
  created_at?: Date;
  updated_at?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  
  // Joined venue data (when populated)
  venue?: Venue;
  
  // Legacy fields for backward compatibility
  legacy_general_location?: string;
  legacy_specific_location?: string;
}

export interface EventDistribution {
  id?: number;
  event_id: number;
  platform: 'wordpress' | 'facebook' | 'instagram' | 'eventbrite' | 'meetup' | 'fetlife';
  platform_event_id?: string;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  posted_at?: Date;
  created_at?: Date;
}

export interface EventRSVP {
  id?: number;
  event_id: number;
  email: string;
  name: string;
  phone?: string;
  newsletter_signup: boolean;
  location_revealed: boolean;
  created_at?: Date;
}