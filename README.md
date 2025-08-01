# Event Distribution App

A custom-coded application to replace the n8n/WordPress automation system for creating and distributing Kinky Coffee events. Features a modern React frontend with ChatGPT integration and automated distribution to multiple platforms.

## Features

### Core Functionality
- **Event Creation Form**: Simple interface for date/location input
- **AI Theme Generation**: ChatGPT integration for creative event themes
- **Interactive AI Chat**: Refine themes through conversation with AI
- **Banner Image Generation**: DALL-E integration for event images
- **Multi-Platform Distribution**: Automated posting to 6+ platforms
- **Privacy-First Location Handling**: General location public, specific location revealed only after RSVP

### Distribution Channels
- WordPress (your existing site)
- Facebook (events + page posts)
- Instagram (visual content)
- Eventbrite (professional ticketing)
- Meetup (community discovery)
- FetLife (kink community)

### Privacy & Safety
- Location gating: specific addresses only revealed after RSVP confirmation
- RSVP system with automated location reveal emails
- Newsletter integration with opt-in during RSVP
- Secure data handling for community safety

## Technology Stack

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** for structured data storage
- **OpenAI API** (ChatGPT + DALL-E)

### Frontend
- **React** with TypeScript
- **CSS Modules** for styling
- **Responsive design** for all devices

## Project Structure

```
event-distribution-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── models/
│   │   │   └── Event.ts
│   │   ├── routes/
│   │   │   ├── events.ts
│   │   │   ├── ai.ts
│   │   │   ├── distribution.ts
│   │   │   └── rsvp.ts
│   │   ├── database/
│   │   │   └── schema.sql
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EventCreator.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── AIThemeGenerator.tsx
│   │   │   └── EventPreview.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   └── package.json
└── README.md
```

## Database Schema

### Events Table
- Basic event information (date, locations, theme)
- AI-generated content storage
- Status tracking (draft, scheduled, published, cancelled)

### Event Distributions Table
- Platform-specific posting status
- Error tracking and retry logic
- Platform event IDs for updates

### Event RSVPs Table
- RSVP management with email uniqueness
- Location reveal tracking
- Newsletter signup preferences

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
# Create database and run schema
psql -U postgres -c "CREATE DATABASE event_distribution;"
psql -U postgres -d event_distribution -f src/database/schema.sql
```

5. Start development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

## API Endpoints

### Events
- `POST /api/events` - Create new event
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get single event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### AI Integration
- `POST /api/ai/generate-theme` - Generate theme and description
- `POST /api/ai/generate-image` - Generate banner image
- `POST /api/ai/chat` - Interactive AI chat for refinement

### Distribution
- `POST /api/distribution/publish/:eventId` - Trigger distribution
- `GET /api/distribution/status/:eventId` - Get distribution status

### RSVP System
- `POST /api/rsvp` - Submit RSVP
- `GET /api/rsvp/event/:eventId` - Get event RSVPs (admin)

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DB_HOST=localhost
DB_NAME=event_distribution
DB_USER=postgres
DB_PASSWORD=your_password

# OpenAI
OPENAI_API_KEY=your_openai_key

# Platform APIs (for distribution)
FACEBOOK_ACCESS_TOKEN=your_token
INSTAGRAM_ACCESS_TOKEN=your_token
EVENTBRITE_API_KEY=your_key
MEETUP_API_KEY=your_key
WORDPRESS_URL=your_wordpress_site
WORDPRESS_APP_PASSWORD=your_password
```

## Development Workflow

### 3-Step Event Creation Process

1. **Event Form**: User inputs date, general location, specific location, optional theme override
2. **AI Generation**: ChatGPT generates theme and description, DALL-E creates banner image, interactive chat for refinement
3. **Preview & Publish**: Review complete event, publish to all platforms simultaneously

### Privacy-First Architecture

- **Public Information**: General location, theme, description visible everywhere
- **Private Information**: Specific location only in database and post-RSVP emails
- **RSVP Workflow**: Email → Location reveal → Optional newsletter signup
- **Security**: All sensitive data encrypted, self-hosted for full control

## Improvements Over n8n System

### User Experience
- ✅ Single-page application vs multiple WordPress/n8n interfaces
- ✅ Real-time AI chat vs one-shot generation
- ✅ Live preview before publishing
- ✅ Progress tracking through workflow

### Technical Benefits
- ✅ Full code control vs no-code limitations
- ✅ Better error handling and retry logic
- ✅ Structured database vs WordPress custom fields
- ✅ Type safety with TypeScript
- ✅ Proper separation of concerns

### Cost & Reliability
- ✅ Reduced external dependencies
- ✅ Better cost control and monitoring
- ✅ Improved error logging and debugging
- ✅ Scalable architecture for future features

## Future Enhancements

### Platform Integration Roadmap
1. WordPress REST API integration
2. Facebook Graph API implementation
3. Instagram Basic Display API
4. Eventbrite API integration
5. Meetup API connection
6. FetLife custom integration

### Additional Features
- Analytics dashboard for event performance
- Automated email sequences for attendees
- Event templates and favorites system
- Multi-organizer support for SaaS expansion
- Mobile app for event management

## License

Private project for Kinky Coffee events. Not for public distribution.

## Support

For questions or issues, contact the development team.