# Event Management System Requirements

## Overview
Add event tracking and management capabilities to the Event Distribution App, allowing users to view, organize, and monitor all events created through the system. This functionality will provide calendar and list views with comprehensive status tracking for each distribution platform.

## User Stories
- As an event organizer, I want to see all my created events in one place
- As an event organizer, I want to view events in both calendar and list formats
- As an event organizer, I want to see the posting status for each platform per event
- As an event organizer, I want to filter and search through my events
- As an event organizer, I want to edit or update existing events
- As an event organizer, I want to re-post events to additional platforms

## Core Features

### 1. Event Management Dashboard
**Location**: New page accessible from main navigation
**Route**: `/events` or `/manage-events`

#### Calendar View
- **Month View**: Primary display showing events as blocks on calendar dates
- **Week View**: Detailed view showing events by week with time slots
- **Day View**: Detailed daily schedule view
- **Navigation**: Previous/next month arrows, today button, date picker
- **Event Display**: 
  - Event title
  - Time
  - Venue name (abbreviated if needed)
  - Status indicators (color-coded dots/icons for each platform)
  - Theme name (if available)

#### List View
- **Sortable Columns**:
  - Date/Time
  - Event Title
  - Theme Name
  - Venue
  - Status Summary (posted/failed counts)
  - Created Date
  - Last Modified
- **Filtering Options**:
  - Date range picker
  - Venue dropdown
  - Platform status (all, posted, failed, pending)
  - Theme/event type
- **Search**: Text search across event titles, descriptions, themes
- **Pagination**: Handle large numbers of events efficiently

### 2. Platform Status Tracking
For each event, display posting status for all configured platforms:

#### Status Types
- **Posted**: Successfully published to platform
- **Failed**: Publishing attempt failed
- **Pending**: Not yet attempted or queued for publishing
- **Draft**: Saved but not published
- **Scheduled**: Set to publish at future time

#### Platform-Specific Information
- **WordPress**: Post ID, URL, publication date
- **Facebook**: Event ID, URL, attendee count
- **Instagram**: Post ID, likes/comments
- **Eventbrite**: Event ID, ticket sales, attendee count
- **Meetup**: Event ID, RSVP count
- **Email**: Send date, recipient count, open rate

#### Visual Indicators
- **Color-coded status icons** next to each platform name
- **Progress bars** showing overall posting completion
- **Expandable details** for error messages and platform-specific data
- **Quick retry buttons** for failed posts

### 3. Event Detail View
**Access**: Click on any event from calendar or list view
**Features**:
- Full event information display
- Complete posting history timeline
- Platform-specific performance metrics
- Edit event details button
- Re-post to platforms functionality
- Delete event option
- Export event data

### 4. Bulk Operations
- **Multi-select events** in list view
- **Bulk re-post** to selected platforms
- **Bulk status updates**
- **Bulk delete** with confirmation
- **Export selected events** to CSV/PDF

## Technical Requirements

### Database Schema Updates
```sql
-- Events table (may already exist)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_time TIMESTAMP NOT NULL,
    venue_id INTEGER REFERENCES venues(id),
    theme_name VARCHAR(255),
    theme_description TEXT,
    banner_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform posting status tracking
CREATE TABLE platform_posts (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'wordpress', 'facebook', 'instagram', etc.
    status VARCHAR(20) NOT NULL, -- 'posted', 'failed', 'pending', 'draft'
    platform_id VARCHAR(255), -- External platform's ID for the post
    platform_url TEXT, -- Direct link to the post
    post_data JSONB, -- Platform-specific data (metrics, errors, etc.)
    posted_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying
CREATE INDEX idx_platform_posts_event_platform ON platform_posts(event_id, platform);
CREATE INDEX idx_events_date ON events(date_time);
```

### API Endpoints

#### GET /api/events
- **Query Parameters**:
  - `page`, `limit` for pagination
  - `startDate`, `endDate` for date filtering
  - `venue` for venue filtering
  - `status` for platform status filtering
  - `search` for text search
  - `sort` for sorting (date, title, created_at)
- **Response**: Paginated list of events with platform status summary

#### GET /api/events/:id
- **Response**: Full event details with complete platform posting history

#### PUT /api/events/:id
- **Body**: Updated event data
- **Response**: Updated event with status

#### POST /api/events/:id/repost
- **Body**: Array of platform names to repost to
- **Response**: Updated posting status

#### GET /api/events/calendar/:year/:month
- **Response**: Events organized by date for calendar display

#### GET /api/events/stats
- **Response**: Summary statistics (total events, platform success rates, etc.)

### Frontend Components

#### EventManagement.tsx
- Main container component
- View switching (calendar/list)
- Filtering and search state management
- Event data fetching and caching

#### EventCalendar.tsx
- Calendar grid display
- Month/week/day view switching
- Event positioning and display
- Click handlers for event selection

#### EventList.tsx
- Table/list display of events
- Sorting and pagination
- Bulk selection functionality
- Status indicator components

#### EventDetail.tsx
- Modal or full-page event details
- Platform status timeline
- Edit and action buttons
- Performance metrics display

#### PlatformStatusIndicator.tsx
- Reusable component for showing platform status
- Color-coded icons
- Tooltip with detailed information
- Quick action buttons (retry, view, etc.)

### Integration Points

#### Event Creation Flow Updates
- Automatically create event record in database when event is created
- Track platform posting attempts and results
- Update platform_posts table with success/failure status

#### Platform API Integration
- Modify existing platform posting logic to record status
- Add retry mechanisms for failed posts
- Implement status checking for external platforms

#### Real-time Updates
- WebSocket or polling for live status updates
- Notification system for posting failures
- Background job processing for scheduled posts

## UI/UX Specifications

### Navigation
- Add "Events" or "Manage Events" item to main navigation
- Breadcrumb navigation within event management section
- Quick access button to create new event

### Responsive Design
- Mobile-optimized calendar view (single day/week focus)
- Collapsible platform status details on small screens
- Touch-friendly interaction elements

### Performance Considerations
- Lazy loading for calendar navigation
- Virtual scrolling for large event lists
- Caching strategy for frequently accessed data
- Optimistic UI updates for quick feedback

## Success Metrics
- **User Engagement**: Time spent in event management section
- **Feature Adoption**: Percentage of users using calendar vs list view
- **Error Resolution**: Time to resolve failed platform posts
- **User Satisfaction**: Feedback on event tracking visibility

## Future Enhancements (Phase 2)
- **WordPress Import**: Import existing events from WordPress sites
- **Analytics Dashboard**: Detailed performance metrics across platforms
- **Event Templates**: Save and reuse event configurations
- **Automated Scheduling**: Recurring event creation
- **Team Collaboration**: Multi-user event management
- **Advanced Filtering**: Custom filter combinations and saved views
- **Export Options**: PDF/CSV export with custom formatting
- **Integration APIs**: Webhook support for external calendar systems

## Acceptance Criteria
- [ ] Users can view all created events in both calendar and list formats
- [ ] Platform posting status is clearly visible for each event
- [ ] Failed posts can be retried from the management interface
- [ ] Events can be filtered by date, venue, and status
- [ ] Event details can be viewed and edited from the management page
- [ ] Bulk operations work correctly for multiple event selection
- [ ] Mobile interface is fully functional and responsive
- [ ] Performance remains acceptable with 100+ events loaded
- [ ] All API endpoints return correct data and handle errors gracefully
- [ ] Database queries are optimized with appropriate indexes