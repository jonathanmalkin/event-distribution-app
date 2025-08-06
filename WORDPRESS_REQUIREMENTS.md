# WordPress Integration Requirements - kinky.coffee

## 🎯 **Primary Platform Integration**

WordPress will serve as the **primary event publication platform** for kinky.coffee, replacing Facebook/Instagram as the main distribution channel.

## 📋 **Core Requirements**

### **WordPress REST API Integration**
- **Endpoint**: WordPress REST API v2 (`/wp-json/wp/v2/`)
- **Authentication**: Application passwords or JWT tokens
- **Content Type**: Custom post type for events or standard posts
- **Media Handling**: Featured image upload via REST API

### **Event Post Structure**
```javascript
{
  title: "Event Theme Name",
  content: "AI-generated description with event details",
  featured_media: "uploaded_banner_image_id",
  categories: ["events", "kinky-coffee"],
  tags: ["coffee", "community", "event-date"],
  meta: {
    event_date: "2025-08-15T19:00:00",
    event_venue: "Venue Name",
    event_address: "Full Address",
    rsvp_required: true,
    event_id: "internal_database_id"
  },
  status: "publish" | "draft"
}
```

## 🔧 **Technical Implementation**

### **WordPress Service Class**
- **File**: `src/services/platforms/WordPressService.ts`
- **Methods**:
  - `createPost(eventData)` - Create event post
  - `uploadMedia(imageUrl)` - Upload banner image
  - `updatePost(postId, data)` - Update existing post
  - `deletePost(postId)` - Remove event post
  - `testConnection()` - Verify API access

### **Authentication Options**
1. **Application Passwords** (Recommended)
   - WordPress 5.6+ built-in feature
   - User-specific passwords for API access
   - Easy setup and management

2. **JWT Authentication Plugin**
   - More secure for production
   - Token-based authentication
   - Requires plugin installation

### **Required Environment Variables**
```bash
# WordPress Configuration
WORDPRESS_SITE_URL=https://kinky.coffee
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=your_application_password
# OR for JWT
WORDPRESS_JWT_SECRET=your_jwt_secret
```

## 📝 **Content Strategy**

### **Post Categories & Tags**
- **Categories**: "Events", "Kinky Coffee", "Community"
- **Tags**: Dynamic based on theme, date, venue
- **Custom Fields**: Event metadata for structured data

### **SEO Optimization**
- **Title Format**: "Theme Name - Kinky Coffee Event - Date"
- **Meta Description**: First 160 chars of AI description
- **Featured Image**: AI-generated banner (optimized size)
- **Schema Markup**: Event structured data

### **Content Template**
```html
<div class="kinky-coffee-event">
  <div class="event-header">
    <h2>[Event Theme]</h2>
    <div class="event-meta">
      <span class="date">📅 [Formatted Date]</span>
      <span class="time">⏰ [Time]</span>
      <span class="venue">📍 [Venue Name]</span>
    </div>
  </div>
  
  <div class="event-description">
    [AI-Generated Description]
  </div>
  
  <div class="event-details">
    <h3>Event Details</h3>
    <ul>
      <li><strong>When:</strong> [Full Date & Time]</li>
      <li><strong>Where:</strong> [Venue with Address]</li>
      <li><strong>RSVP:</strong> Required for location details</li>
    </ul>
  </div>
  
  <div class="event-rsvp">
    <a href="/rsvp?event=[event_id]" class="rsvp-button">RSVP Now</a>
  </div>
</div>
```

## 🎨 **Media Management**

### **Image Upload Process**
1. **Fetch AI Image**: Download from OpenAI DALL-E URL
2. **Upload to WordPress**: POST to `/wp/v2/media`
3. **Set Featured Image**: Link to event post
4. **Alt Text**: Auto-generated based on event theme
5. **Image Optimization**: WordPress handles resizing

### **Image Requirements**
- **Format**: PNG/JPG (WordPress handles conversion)
- **Size**: Original from DALL-E (WordPress creates thumbnails)
- **Alt Text**: Event theme + "Kinky Coffee Event Banner"
- **Caption**: Event date and venue

## 🔄 **Sync & Update Strategy**

### **Post Status Management**
- **Draft**: Events created but not ready to publish
- **Scheduled**: Events scheduled for future publication
- **Published**: Live events visible on site
- **Trash**: Cancelled or deleted events

### **Update Scenarios**
1. **Event Modified**: Update existing post content
2. **Date Changed**: Update post meta and content
3. **Venue Changed**: Update address and meta
4. **Cancelled**: Move to trash or add cancellation notice

### **Sync Frequency**
- **Real-time**: On event creation/modification
- **Batch Sync**: Nightly sync for any missed updates
- **Status Check**: Verify post exists and is current

## 🔒 **Security & Permissions**

### **WordPress User Setup**
- **Role**: Editor or Administrator
- **Capabilities**: 
  - `edit_posts`
  - `publish_posts`
  - `upload_files`
  - `edit_published_posts`

### **API Security**
- **HTTPS Only**: All API calls over SSL
- **Application Passwords**: Secure credential storage
- **Rate Limiting**: Respect WordPress API limits
- **Error Handling**: Graceful failure management

## 📊 **Success Metrics**

### **Technical KPIs**
- **Post Creation**: <30 seconds from event to live post
- **Image Upload**: 100% success rate
- **Sync Accuracy**: Events match database state
- **API Reliability**: 99%+ uptime integration

### **Content Quality**
- **SEO Score**: >80 on WordPress SEO tools
- **Load Time**: <3 seconds with images
- **Mobile Responsive**: Perfect display on all devices
- **Accessibility**: WCAG 2.1 AA compliance

## 🚀 **Implementation Priority**

### **Phase 1: Basic Integration**
1. WordPress service class
2. Post creation with content
3. Image upload and linking
4. Basic error handling

### **Phase 2: Advanced Features**
1. Custom fields and meta
2. SEO optimization
3. Scheduled publishing
4. Update/sync functionality

### **Phase 3: Production Polish**
1. Comprehensive error handling
2. Performance optimization
3. Monitoring and logging
4. Admin interface integration

## 🎯 **Expected Outcome**

A seamless integration where events created in the Event Distribution App automatically appear as professional, SEO-optimized posts on kinky.coffee with:

- **Beautiful AI-generated images** as featured images
- **Rich event content** with structured data
- **RSVP integration** linking back to the app
- **Mobile-responsive design** that matches site theme
- **Search engine optimization** for event discovery
- **Real-time publishing** with immediate visibility