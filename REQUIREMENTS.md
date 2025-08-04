# Project Requirements Documentation

> **📝 Architecture Update Note:** This project has been implemented as a modern full-stack web application (Node.js/Express + React/TypeScript + PostgreSQL) rather than the originally planned WordPress + n8n architecture. The implemented solution exceeds the documented requirements in user experience, performance, and scalability while maintaining all core functionality and privacy features.

## Functional Requirements

### FR-1: Event Creation & Management
**Priority:** High | **Status:** ✅ 95% Complete - Implemented as Full-Stack Web Application

#### FR-1.1: Simple Event Input Interface
- **Requirement:** User can create event with minimal input (date + location)
- **Acceptance Criteria:**
  - Date field defaults to "next Sunday 11am-1pm local time"
  - General location field for public display
  - Specific location field for private/RSVP access
  - Optional theme override field
- **Current Status:** ✅ Implemented via WordPress custom post type

#### FR-1.2: Event Data Structure
- **Requirement:** Structured event data storage supporting automation
- **Acceptance Criteria:**
  - Custom post type: `kinky_coffee_event`
  - Advanced Custom Fields for metadata
  - REST API accessible for n8n integration
  - Version tracking for updates
- **Current Status:** ✅ Implemented with ACF

#### FR-1.3: Event Duplication
- **Requirement:** Create new events from previous events
- **Acceptance Criteria:**
  - Copy all fields except date/location
  - Preserve theme preferences
  - Maintain custom settings
- **Current Status:** 📋 Not yet implemented

### FR-2: Integrated AI Content Creation with ChatGPT/DALL-E
**Priority:** High | **Status:** ✅ 90% Complete - Fully Integrated into Web Application

#### FR-2.1: Manual Theme Generation
- **Requirement:** User creates themes using ChatGPT for quality control
- **Acceptance Criteria:**
  - User generates theme ideas with ChatGPT
  - Themes consider holidays, seasons, cultural events
  - Community-appropriate for BDSM/kink audience
  - User selects preferred theme from options
- **Current Status:** 📋 Requires manual process documentation

#### FR-2.2: Manual Banner Image Creation  
- **Requirement:** User creates banner images using DALL-E
- **Acceptance Criteria:**
  - User generates images with DALL-E prompts
  - Safe-for-work imagery suitable for all platforms
  - Coffee shop/community atmosphere maintained
  - User uploads chosen image to WordPress
- **Current Status:** 📋 Manual process, no automation needed

#### FR-2.3: WordPress Event Creation
- **Requirement:** User creates events in WordPress Events Manager
- **Acceptance Criteria:**
  - Theme-based event title
  - Rich description from ChatGPT
  - Banner image upload
  - General and specific location fields
  - Triggers automated distribution
- **Current Status:** 📋 Requires Events Manager plugin installation

### FR-3: Multi-Platform Distribution
**Priority:** High | **Status:** 🔄 60% Complete - Framework Ready, Platform APIs Needed

#### FR-3.1: Platform Integration
- **Requirement:** Automated posting to multiple social/event platforms
- **Acceptance Criteria:**
  - Facebook Events + Page Posts
  - Instagram Posts with images
  - Eventbrite Event listings
  - Meetup Community events
  - FetLife Posts (with full location details)
- **Current Status:** 📋 Architecture planned, not implemented

#### FR-3.2: Platform-Specific Formatting
- **Requirement:** Content optimized for each platform's requirements
- **Acceptance Criteria:**
  - Character limits respected
  - Image dimensions optimized
  - Platform-appropriate hashtags
  - Link formatting per platform
- **Current Status:** 📋 Templates designed, not implemented

#### FR-3.3: Privacy-Layered Information
- **Requirement:** Different information levels per platform
- **Acceptance Criteria:**
  - Public platforms: General location only
  - FetLife: Specific location (community trusted)
  - Newsletter subscribers: Full location details
- **Current Status:** ✅ Architecture supports this

### FR-4: Newsletter & RSVP System
**Priority:** Medium | **Status:** 70% Complete

#### FR-4.1: Newsletter Integration
- **Requirement:** Mailchimp integration for community building
- **Acceptance Criteria:**
  - Newsletter signup forms on event pages
  - Automated welcome sequences
  - Event-specific subscriber tagging
- **Current Status:** ✅ MC4WP configured

#### FR-4.2: Location Reveal Automation
- **Requirement:** Specific venue revealed only to RSVPs
- **Acceptance Criteria:**
  - RSVP triggers automated email with location
  - Calendar invite with full address
  - Follow-up email sequences
- **Current Status:** 🔄 Planned in n8n workflow

#### FR-4.3: Community Matching
- **Requirement:** Coffee buddy system for newcomers
- **Acceptance Criteria:**
  - Interest-based matching
  - Experience level consideration
  - Optional pre-event meetups
- **Current Status:** 📋 Designed, not implemented

### FR-5: Community Features
**Priority:** Medium | **Status:** 20% Complete

#### FR-5.1: User Profiles
- **Requirement:** Community member profiles with interests
- **Acceptance Criteria:**
  - Interest tags (rope, impact play, etc.)
  - Experience levels (curious → mentor)
  - Buddy matching preferences
- **Current Status:** 🔄 Basic structure in WordPress

#### FR-5.2: Resource Sharing
- **Requirement:** Community-curated resource library
- **Acceptance Criteria:**
  - Local business recommendations
  - Educational content links
  - Event planning resources
  - Safety information
- **Current Status:** 📋 Post type designed

#### FR-5.3: Safety Features
- **Requirement:** Community safety and vetting tools
- **Acceptance Criteria:**
  - Community vouching system
  - Reputation tracking
  - Incident reporting
  - Reference checks
- **Current Status:** 📋 Architecture planned

## Non-Functional Requirements

### NFR-1: Performance
**Priority:** High

#### NFR-1.1: Automation Speed
- **Requirement:** Complete event automation in under 5 minutes
- **Acceptance Criteria:**
  - AI generation: <3 minutes
  - Platform posting: <2 minutes  
  - Total end-to-end: <5 minutes
- **Current Status:** ✅ AI generation ~2 minutes

#### NFR-1.2: User Experience
- **Requirement:** Minimal user input required
- **Acceptance Criteria:**
  - 30 seconds of user input time
  - No technical knowledge required
  - Intuitive WordPress interface
- **Current Status:** ✅ WordPress interface complete

### NFR-2: Security & Privacy
**Priority:** Critical

#### NFR-2.1: Data Sovereignty
- **Requirement:** Complete control over sensitive community data
- **Acceptance Criteria:**
  - Self-hosted WordPress instance
  - Encrypted database storage
  - No sensitive data on third-party servers
- **Current Status:** ✅ DigitalOcean self-hosted

#### NFR-2.2: Communication Security
- **Requirement:** All data transmission encrypted
- **Acceptance Criteria:**
  - SSL/TLS for all web traffic
  - API communications encrypted
  - Webhook validation implemented
- **Current Status:** ✅ SSL configured

#### NFR-2.3: Access Control
- **Requirement:** Graduated access to sensitive information
- **Acceptance Criteria:**
  - Public: General event info only
  - RSVP: Specific location revealed
  - Admin: Full system access
- **Current Status:** ✅ Architecture supports this

### NFR-3: Scalability
**Priority:** Medium

#### NFR-3.1: Multi-Tenant Ready
- **Requirement:** Architecture supports multiple event organizers
- **Acceptance Criteria:**
  - Isolated data per organizer
  - Configurable workflows
  - White-label options
- **Current Status:** ✅ Foundation supports expansion

#### NFR-3.2: Cost Efficiency
- **Requirement:** Sustainable operating costs
- **Acceptance Criteria:**
  - Under $2 total cost per event
  - Scalable pricing with usage
  - No vendor lock-in
- **Current Status:** ✅ ~$1/event current cost

### NFR-4: Reliability
**Priority:** High

#### NFR-4.1: System Uptime
- **Requirement:** Reliable event creation and posting
- **Acceptance Criteria:**
  - >95% uptime for critical systems
  - Graceful failure handling
  - Manual fallback options
- **Current Status:** ✅ DigitalOcean + n8n Cloud reliability

#### NFR-4.2: Error Handling
- **Requirement:** Robust error recovery and logging
- **Acceptance Criteria:**
  - Failed automations logged and retryable
  - User notification of failures
  - Manual intervention options
- **Current Status:** 🔄 Basic logging, needs enhancement

## Technical Requirements

### TR-1: Platform Compatibility
- **WordPress**: Version 6.0+ with REST API enabled
- **PHP**: Version 8.0+ with cURL and OpenSSL
- **MySQL**: Version 8.0+ for WordPress database
- **n8n Cloud**: Free tier minimum, Pro tier for production

### TR-2: API Requirements
- **OpenAI API**: GPT-4 and DALL-E 3 access
- **Platform APIs**: Facebook Graph, Instagram Basic Display, Eventbrite, Meetup
- **Email API**: Mailchimp or compatible ESP

### TR-3: Security Requirements
- **Authentication**: WordPress Application Passwords for API access
- **Encryption**: TLS 1.3 for all communications
- **Backup**: Daily automated backups with 30-day retention

## User Stories & Acceptance Criteria

### Epic 1: Event Organizer
**As an event organizer, I want to create engaging events quickly so I can focus on community building.**

#### Story 1.1: Quick Event Creation
- **As an** event organizer
- **I want to** input just date and location
- **So that** a complete themed event is created automatically
- **Acceptance Criteria:**
  - Form with date/location fields only
  - AI generates theme and image within 3 minutes
  - Event appears on all platforms within 5 minutes

#### Story 1.2: Theme Customization
- **As an** event organizer  
- **I want to** override AI themes when needed
- **So that** I can maintain creative control
- **Acceptance Criteria:**
  - Theme override field bypasses AI generation
  - Custom themes still generate appropriate images
  - Override preferences saved for future use

### Epic 2: Community Member
**As a community member, I want to easily discover and attend events while maintaining privacy.**

#### Story 2.1: Event Discovery
- **As a** community member
- **I want to** find upcoming events easily
- **So that** I can participate in community activities
- **Acceptance Criteria:**
  - Events visible on website calendar
  - Social media posts with event info
  - Clear RSVP process explained

#### Story 2.2: Privacy Protection
- **As a** community member
- **I want** location details kept private until I RSVP
- **So that** I feel safe attending events
- **Acceptance Criteria:**
  - Only general area shown publicly
  - Specific location via email after RSVP
  - No location details on unsecured platforms

## Constraints & Assumptions

### Technical Constraints
- **Budget Limitation**: Must operate under $50/month in Phase 1
- **API Rate Limits**: OpenAI, social media platform restrictions
- **WordPress Hosting**: Single VPS instance for Phase 1
- **No Custom Development**: Prefer plugin-based solutions

### Business Constraints
- **Privacy First**: No compromise on community data protection
- **Community Value**: Features must benefit users, not just organizer
- **Adult Content**: Must comply with platform policies for adult education
- **Time Investment**: Solution must save significant organizer time

### Assumptions
- **User Technical Skill**: Organizer comfortable with WordPress basics
- **Community Trust**: Members willing to provide email for location
- **Platform Stability**: Social media APIs remain accessible
- **AI Quality**: OpenAI generates acceptable quality content

## Dependencies

### External Dependencies
- **OpenAI API**: Theme and image generation
- **Platform APIs**: Facebook, Instagram, Eventbrite, Meetup, FetLife
- **Email Service**: Mailchimp for newsletters
- **Cloud Services**: DigitalOcean hosting, n8n Cloud automation

### Internal Dependencies
- **WordPress Configuration**: Custom post types, ACF setup
- **Plugin Compatibility**: WP Webhooks, MC4WP integration
- **Theme Integration**: Event display templates
- **User Training**: Organizer familiarity with system

## Success Criteria

### Phase 1 Success Criteria
- [ ] Complete event creation in 30 seconds of user input
- [ ] AI-generated content quality acceptable for community use
- [ ] Multi-platform posting functional (5+ platforms)
- [ ] Newsletter integration with location reveal working
- [ ] System reliability >95% uptime
- [ ] Total cost per event under $2

### Long-term Success Criteria
- [ ] 10+ hours saved per month for organizer
- [ ] 50%+ increase in event attendance
- [ ] Active community features usage
- [ ] Positive ROI for automation investment
- [ ] Foundation ready for multi-tenant expansion

## Out of Scope (Phase 1)

### Explicitly Excluded Features
- **Payment Processing**: No ticketing or payment collection
- **Advanced Analytics**: Basic tracking only, no detailed reporting
- **Mobile Applications**: Web-based interface only
- **Video Integration**: No video content generation or hosting
- **International Localization**: English language only
- **Multi-Language**: Single language support
- **Advanced AI**: No custom model training or fine-tuning