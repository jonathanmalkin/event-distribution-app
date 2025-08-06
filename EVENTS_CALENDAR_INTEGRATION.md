# The Events Calendar WordPress Integration

## 🎯 **Plugin Overview**

The Events Calendar plugin creates events using the **`tribe_events`** custom post type and provides comprehensive REST API integration for creating and managing events programmatically.

## 🔧 **REST API Integration**

### **Base Endpoint**
```
POST /wp-json/tribe/events/v1/events
GET  /wp-json/tribe/events/v1/events/{id}
PUT  /wp-json/tribe/events/v1/events/{id}
DELETE /wp-json/tribe/events/v1/events/{id}
```

### **Event Data Structure**
```javascript
{
  title: "Event Theme Name",
  content: "AI-generated description with event details",
  excerpt: "Short event summary",
  status: "publish", // or "draft"
  featured_media: uploaded_image_id,
  
  // The Events Calendar specific fields
  start_date: "2025-08-15 19:00:00",
  end_date: "2025-08-15 21:00:00",
  all_day: false,
  timezone: "America/Los_Angeles",
  
  // Venue information
  venue: {
    venue: "Analog Coffee",
    address: "235 Summit Ave E",
    city: "Seattle",
    state: "WA",
    zip: "98102",
    country: "US"
  },
  
  // Custom meta fields for RSVP system
  meta: {
    _kinky_coffee_general_location: "Capitol Hill area, Seattle",
    _kinky_coffee_specific_location: "Analog Coffee, 235 Summit Ave E",
    _kinky_coffee_rsvp_required: "true",
    _kinky_coffee_rsvp_count: "0",
    _kinky_coffee_event_id: "internal_database_id"
  }
}
```

## 🏗️ **WordPress Service Implementation**

### **Service Class Structure**
```typescript
// src/services/platforms/WordPressService.ts
export class WordPressService {
  private siteUrl: string;
  private jwtToken: string;
  private apiVersion: string = 'tribe/events/v1';
  
  constructor() {
    this.siteUrl = process.env.WORDPRESS_SITE_URL || '';
    this.jwtToken = process.env.WORDPRESS_JWT_TOKEN || '';
  }
  
  // Authentication
  async authenticate(username: string, password: string): Promise<string>
  async refreshToken(): Promise<string>
  
  // Event Management
  async createEvent(eventData: EventData): Promise<{ id: string; url: string }>
  async updateEvent(eventId: string, updates: Partial<EventData>): Promise<boolean>
  async deleteEvent(eventId: string): Promise<boolean>
  async getEvent(eventId: string): Promise<any>
  
  // Media Management
  async uploadImage(imageUrl: string): Promise<string>
  async optimizeImage(imageBuffer: Buffer): Promise<Buffer>
  
  // Utilities
  async testConnection(): Promise<{ success: boolean; message: string }>
}
```

### **JWT Authentication Setup**
```bash
# Required WordPress plugins
# 1. JWT Authentication for WP REST API
# 2. The Events Calendar (free or pro)

# Environment variables
WORDPRESS_SITE_URL=https://kinky.coffee
WORDPRESS_JWT_SECRET=your_jwt_secret_key
WORDPRESS_USERNAME=admin_username
WORDPRESS_PASSWORD=admin_password
```

## 🖼️ **Image Optimization Strategy**

### **Pre-upload Processing**
```typescript
async optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  // Resize for WordPress featured images
  const optimized = await sharp(imageBuffer)
    .resize(1200, 630, { // WordPress recommended featured image size
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ 
      quality: 85,
      progressive: true 
    })
    .toBuffer();
    
  return optimized;
}
```

### **Upload Process**
1. **Fetch AI image**: Download from OpenAI DALL-E URL
2. **Optimize**: Resize to 1200x630, compress to ~200KB
3. **Upload to WordPress**: POST to `/wp-json/wp/v2/media`
4. **Set as featured**: Link to event post
5. **Alt text**: Auto-generate from event theme

## 🎯 **Custom RSVP Plugin Architecture**

### **Plugin Structure**
```
wp-kinky-coffee-rsvp/
├── kinky-coffee-rsvp.php
├── includes/
│   ├── class-rsvp-handler.php
│   ├── class-location-reveal.php
│   ├── class-email-integration.php
│   └── class-admin-interface.php
├── templates/
│   ├── rsvp-form.php
│   ├── location-reveal.php
│   └── rsvp-confirmation.php
├── assets/
│   ├── rsvp-form.js
│   └── rsvp-styles.css
└── api/
    └── class-rsvp-rest-api.php
```

### **RSVP Database Schema**
```sql
CREATE TABLE wp_kinky_coffee_rsvps (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  event_id bigint(20) NOT NULL,
  user_email varchar(100) NOT NULL,
  user_name varchar(100),
  rsvp_status enum('yes','no','maybe') DEFAULT 'yes',
  source_platform varchar(50), -- 'wordpress', 'fetlife', 'eventbrite'
  location_revealed tinyint(1) DEFAULT 0,
  newsletter_signup tinyint(1) DEFAULT 0,
  dietary_restrictions text,
  experience_level varchar(50),
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_rsvp (event_id, user_email),
  INDEX idx_event_id (event_id),
  INDEX idx_email (user_email)
);
```

### **RSVP REST API Endpoints**
```
POST /wp-json/kinky-coffee/v1/rsvp
GET  /wp-json/kinky-coffee/v1/rsvp/{event_id}
GET  /wp-json/kinky-coffee/v1/rsvp/{event_id}/count
POST /wp-json/kinky-coffee/v1/rsvp/{event_id}/reveal-location
```

## 🔗 **Cross-Platform RSVP Integration**

### **RSVP URL Structure**
```
WordPress: https://kinky.coffee/rsvp?event=123&source=wordpress
FetLife:   https://kinky.coffee/rsvp?event=123&source=fetlife
Eventbrite: https://kinky.coffee/rsvp?event=123&source=eventbrite
```

### **Location Reveal Logic**
```php
// Different location info based on source
function get_location_for_source($event_id, $source) {
  switch($source) {
    case 'wordpress':
      return get_post_meta($event_id, '_general_location', true);
    case 'fetlife':
    case 'rsvp':
      return get_post_meta($event_id, '_specific_location', true);
    default:
      return get_post_meta($event_id, '_general_location', true);
  }
}
```

## 🎨 **Astra Theme Integration**

### **Custom Event Templates**
```php
// Override tribe events templates for Astra theme
// wp-content/themes/astra-child/tribe-events/
├── single-event.php        // Individual event display
├── archive-events.php      // Events list page
└── modules/
    ├── event-rsvp.php      // RSVP form integration
    └── event-location.php  // Location display logic
```

### **Spectra Blocks Integration**
- **Custom blocks**: RSVP form block for Spectra
- **Event cards**: Styled event display blocks
- **Location reveal**: Conditional content blocks

## 📊 **Analytics and Tracking**

### **RSVP Metrics**
- **Conversion rates**: By source platform
- **Location reveal**: How many RSVPs access location
- **Newsletter signups**: Email list growth
- **No-show tracking**: Event attendance vs RSVPs

### **Integration with Event Distribution App**
```typescript
// Sync RSVP data back to main database
async syncRSVPData(eventId: number): Promise<void> {
  const wordpressRSVPs = await this.wordpressService.getRSVPs(eventId);
  await this.updateLocalRSVPCount(eventId, wordpressRSVPs.length);
}
```

## 🚀 **Implementation Timeline**

### **Week 1: Foundation**
1. **Staging environment**: Set up Cloudways DigitalOcean
2. **JWT authentication**: Install and configure plugin
3. **Basic WordPress service**: Event creation and image upload
4. **Testing**: Simple event creation from Event Distribution App

### **Week 2: RSVP System**
1. **Custom RSVP plugin**: Basic version with database
2. **RSVP forms**: Frontend and backend processing  
3. **Location reveal**: Conditional display logic
4. **Email integration**: Basic Mailchimp connection

### **Week 3: Advanced Features**
1. **Cross-platform RSVPs**: Handle traffic from other platforms
2. **Admin interface**: RSVP management dashboard
3. **Analytics**: Tracking and reporting
4. **Theme integration**: Custom templates for Astra

### **Week 4: FetLife Integration**
1. **Puppeteer setup**: Basic automation framework
2. **Event posting**: Create FetLife events with RSVP links
3. **Testing**: End-to-end workflow
4. **Documentation**: Admin guides and maintenance

## 💰 **Total Cost Estimate**

- **Hosting**: $11/month (Cloudways)  
- **Development**: ~$800 one-time (custom RSVP plugin)
- **JWT Plugin**: Free
- **The Events Calendar**: Free (Pro upgrade $99/year if needed)
- **Total First Year**: ~$932 + monthly hosting

This creates a complete, privacy-conscious event distribution system with WordPress as the primary platform and comprehensive RSVP management.