# Platform Integration Setup Guide

## Overview

This guide will walk you through setting up API integrations for each platform supported by the Event Distribution App. The app can now post events to Facebook, Instagram, and Eventbrite using real API integrations instead of simulation.

## 🚨 Security Notice

**IMPORTANT**: All credentials should be stored in environment variables. Never commit actual API keys to version control. See `SECURITY_FINDINGS.md` for detailed security requirements.

## Prerequisites

1. **Database Setup**: Run the enhanced schema
   ```bash
   psql -U postgres -d event_distribution -f backend/src/database/schema_platform_enhancements.sql
   ```

2. **Environment Variables**: Copy and configure
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your actual credentials
   ```

## Platform Setup Instructions

### 1. Facebook Integration

**What you'll need:**
- Facebook Developer Account
- Facebook Page (for posting events)
- Page Access Token with appropriate permissions

**Setup Steps:**

1. **Create Facebook App**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app → "Business" type
   - Add "Facebook Login" and "Marketing API" products

2. **Get Page Access Token**
   - In Graph API Explorer: [https://developers.facebook.com/tools/explorer/]
   - Select your app and get User Access Token
   - Grant permissions: `pages_manage_events`, `pages_manage_posts`, `pages_read_engagement`
   - Get your page ID and exchange for Page Access Token

3. **Environment Variables**
   ```bash
   FACEBOOK_ACCESS_TOKEN=your_page_access_token_here
   FACEBOOK_PAGE_ID=your_facebook_page_id_here
   ```

**Test Connection:**
```bash
curl -X POST http://localhost:3001/api/config/test-connections \
-H "Content-Type: application/json" \
-d '{"platforms": ["facebook"]}'
```

### 2. Instagram Integration

**What you'll need:**
- Instagram Business Account
- Facebook Page connected to Instagram account
- Instagram Basic Display API access

**Setup Steps:**

1. **Connect Instagram to Facebook**
   - Ensure your Instagram account is a Business account
   - Connect it to a Facebook Page in Instagram settings

2. **Facebook App Configuration**
   - Add "Instagram Basic Display" product to your Facebook app
   - Configure Instagram Basic Display settings

3. **Get Access Token**
   - Use Graph API Explorer to get Instagram Business Account ID
   - Generate access token with `instagram_basic` permissions

4. **Environment Variables**
   ```bash
   INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
   INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here
   ```

**Test Connection:**
```bash
curl -X POST http://localhost:3001/api/config/test-connections \
-H "Content-Type: application/json" \
-d '{"platforms": ["instagram"]}'
```

### 3. Eventbrite Integration

**What you'll need:**
- Eventbrite account
- Eventbrite Private Token
- Organization ID

**Setup Steps:**

1. **Get API Credentials**
   - Go to [Eventbrite Developer Portal](https://www.eventbrite.com/platform/)
   - Create an app or use personal token
   - Get your Private Token from Account Settings → Developer Links

2. **Find Organization ID**
   - Use API call: `GET https://www.eventbriteapi.com/v3/users/me/organizations/`
   - Or check URL when managing events: `eventbrite.com/o/your-org-id`

3. **Environment Variables**
   ```bash
   EVENTBRITE_API_KEY=your_private_token_here
   EVENTBRITE_ORGANIZATION_ID=your_organization_id_here
   ```

**Test Connection:**
```bash
curl -X POST http://localhost:3001/api/config/test-connections \
-H "Content-Type: application/json" \
-d '{"platforms": ["eventbrite"]}'
```

## Testing Platform Integrations

### 1. Test All Connections
```bash
curl -X GET http://localhost:3001/api/distribution/test-connections
```

### 2. Test Event Distribution
```bash
# First create an event through the frontend, then:
curl -X POST http://localhost:3001/api/distribution/publish/1 \
-H "Content-Type: application/json" \
-d '{"platforms": ["facebook", "instagram", "eventbrite"]}'
```

### 3. Check Distribution Status
```bash
curl -X GET http://localhost:3001/api/distribution/status/1
```

### 4. Sync Event Metrics
```bash
curl -X POST http://localhost:3001/api/distribution/sync/1
```

## API Endpoints Added

### Distribution Endpoints
- `POST /api/distribution/publish/:eventId` - Distribute event to platforms
- `GET /api/distribution/status/:eventId` - Get distribution status
- `POST /api/distribution/sync/:eventId` - Sync metrics from platforms
- `GET /api/distribution/test-connections` - Test all platform connections

### Enhanced Configuration
- `POST /api/config/test-connections` - Test specific platforms
  - Supports: `facebook`, `instagram`, `eventbrite`, `openai`

## Database Schema Updates

New tables added:
- `platform_tokens` - Encrypted credential storage (future use)
- `platform_sync_jobs` - Track sync operations
- `platform_event_details` - Enhanced platform metrics

Enhanced columns in `event_distributions`:
- `platform_url` - Direct link to platform event/post
- `metrics` - JSON metrics (attendees, likes, shares, etc.)
- `last_synced` - Timestamp of last metric sync

## Privacy Features

### Location Privacy
- **Facebook/Instagram**: Only shows general location (city, state)
- **Eventbrite**: Shows full venue address for professional ticketing
- **Future FetLife**: Will show specific location for trusted community

### Content Privacy
- Event descriptions are community-appropriate
- Banner images are safe-for-work across all platforms
- Specific venue details only revealed via RSVP email

## Error Handling

### Common Issues

1. **"Service not configured" errors**
   - Check environment variables are set correctly
   - Restart server after changing .env file

2. **Facebook API errors**
   - Verify page access token has correct permissions
   - Check Facebook app is in Development vs Live mode
   - Ensure page is published and accessible

3. **Instagram posting failures**
   - Verify image URL is accessible and valid format (JPG/PNG)
   - Check Instagram Business account is properly connected
   - Ensure access token has correct permissions

4. **Eventbrite API errors**
   - Verify private token is active
   - Check organization ID is correct
   - Ensure account has permission to create events

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages and API responses.

## Rate Limits & Best Practices

### Facebook
- 200 calls per hour per user
- Implement exponential backoff for failures

### Instagram
- 200 calls per hour per user
- Image must be publicly accessible URL

### Eventbrite
- 1000 calls per hour
- Events must be published separately after creation

## Next Steps

### Immediate
1. Configure your API credentials using this guide
2. Test each platform integration
3. Create a test event and verify distribution

### Future Enhancements
1. **Meetup Integration** - Limited by API restrictions
2. **FetLife Integration** - Requires web automation with Puppeteer
3. **Email Service** - Location reveal automation
4. **Authentication** - Secure configuration management

## Troubleshooting

### Connection Test Failures
```bash
# Test individual platforms
curl -X POST http://localhost:3001/api/config/test-connections \
-H "Content-Type: application/json" \
-d '{"platforms": ["facebook"]}'
```

### Distribution Failures
Check the `event_distributions` table for error messages:
```sql
SELECT platform, status, error_message, platform_url 
FROM event_distributions 
WHERE event_id = 1;
```

### Enable Debug Logging
```bash
# In your .env file
NODE_ENV=development
```

## Support

For issues with platform integrations:
1. Check platform-specific developer documentation
2. Verify API credentials and permissions
3. Test API calls directly using curl or Postman
4. Check application logs for detailed error messages

---

**Remember**: Never commit actual API credentials to version control. Always use environment variables and keep your `.env` file secure.