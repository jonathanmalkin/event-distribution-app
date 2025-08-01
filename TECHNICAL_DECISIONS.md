# Technical Architecture & Decisions

## Technology Stack Decisions

### Selected Architecture: Self-Hosted WordPress + n8n Cloud
**Decision Rationale:**
- **Privacy-first**: Critical for sensitive community events
- **Cost-effective**: ~$30/month vs $100+ for SaaS alternatives  
- **Flexibility**: Complete control over features and data
- **Scalability**: Can evolve into multi-tenant SaaS platform

### Core Technology Components

#### Content Management: WordPress
- **Rationale**: Familiar, extensible, strong community
- **Event Management**: The Events Calendar plugin for professional event handling
- **Plugins**: 
  - The Events Calendar (core event management)
  - MC4WP (Mailchimp integration)
  - WP Webhooks (n8n integration)
  - **Removed**: Advanced Custom Fields, Custom Post Type UI (replaced by The Events Calendar)

#### Automation Engine: n8n Cloud  
- **Rationale**: Visual workflows, extensive integrations, cost-effective
- **Alternative Considered**: Self-hosted n8n (rejected for complexity in Phase 1)
- **Pricing**: Free tier sufficient for testing, $20/month for production

#### AI Content Generation: OpenAI API
- **ChatGPT-4**: Theme generation with community-appropriate prompts
- **DALL-E 3**: Banner image generation with adult-community safe prompts
- **Cost**: ~$0.50-1.00 per event for theme + image generation

#### Newsletter: Mailchimp
- **Rationale**: Reliable, feature-rich, better than Newsletter plugin
- **Integration**: MC4WP plugin + n8n webhooks for location reveal
- **RSVP Flow**: Newsletter signup → automated location email

## Rejected Alternatives

### SaaS Automation Platforms
**Rejected**: Zapier, Make.com hosted solutions
- **Reason**: No FetLife integration, higher long-term costs, less privacy control

### Self-Hosted Image Generation  
**Rejected**: Stable Diffusion local deployment
- **Reason**: GPU hosting costs, maintenance complexity, OpenAI quality sufficient

### Custom Application Development
**Rejected**: Node.js + React custom build
- **Reason**: WordPress provides faster MVP, proven plugins ecosystem

## Architecture Patterns

### Event-Driven Automation
```
WordPress Event Creation → Webhook → n8n Workflow → Multi-Platform Distribution
```

### Privacy-Layered Information
```
Public Platforms: General location + theme
Private Access: Specific location via newsletter signup
FetLife: Full details for community members
```

### Community-First Design
```
Value Creation → Engagement → Newsletter Growth → Revenue Opportunities
```

## Security & Privacy Measures

### Data Protection
- **Self-hosted WordPress**: Complete data sovereignty
- **Encrypted database storage**: Sensitive location information protected
- **SSL/TLS**: All communications encrypted
- **Limited data retention**: Only necessary information stored

### Access Controls
- **VPN-only admin access**: Administrative interfaces protected
- **Application passwords**: WordPress API security
- **Webhook validation**: n8n webhook endpoints secured

### Community Safety
- **Location gating**: Specific venues only revealed to RSVPs
- **Graduated information sharing**: Different detail levels per platform
- **Manual FetLife posting option**: Community-appropriate discretion

## Integration Strategy

### Platform-Specific Approaches
- **Facebook**: Events + page posts via Graph API
- **Instagram**: Visual content via Basic Display API  
- **Eventbrite**: Professional listings via REST API
- **Meetup**: Community events via API
- **FetLife**: Custom web automation (no official API)

### Webhook Architecture
```
WordPress → WP Webhooks Plugin → n8n Cloud → Platform APIs → Response Logging
```

### Error Handling & Monitoring
- **n8n execution logs**: Track automation success/failure
- **WordPress custom fields**: Store platform posting status
- **Manual fallback options**: Ability to post manually if automation fails

## Scalability Considerations

### Multi-Tenant Preparation
- **Isolated WordPress instances**: Easy to convert to multi-site
- **n8n workflow templates**: Reusable automation patterns
- **Database design**: Event and organizer separation ready

### Performance Optimization
- **Image optimization**: Automated resizing for platform requirements
- **Caching strategies**: WordPress caching for public pages
- **API rate limiting**: Respectful platform API usage

### Future Technology Integrations
- **Additional AI models**: Theme generation improvements
- **More platforms**: Discord, Telegram, Twitter/X ready for integration
- **Advanced analytics**: Event performance tracking capabilities