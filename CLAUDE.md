# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Event Distribution Tool is an AI-powered automation system for managing and marketing Kinky Coffee events across multiple platforms. Built as a modern full-stack web application with Node.js/Express backend and React frontend, it transforms hours of manual work into 30 seconds of input.

## Project Status

**Phase 1: Foundation System (90% Complete)**
- Full-stack web application with Node.js/Express backend
- React/TypeScript frontend with comprehensive UI
- PostgreSQL database with advanced event management schema
- Direct OpenAI integration (ChatGPT + DALL-E) working
- Currently implementing: Real platform API integrations (replacing simulation)

## Architecture

### Core Components
- **Backend**: Node.js/Express API server with PostgreSQL database
- **Frontend**: React/TypeScript web application with modern UI
- **Database**: PostgreSQL with comprehensive event, venue, and distribution tracking
- **AI Services**: Direct OpenAI API integration (ChatGPT + DALL-E)
- **Platform APIs**: Facebook, Instagram, Eventbrite, Meetup, FetLife integrations

### Technology Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Frontend**: React, TypeScript, CSS3
- **AI**: OpenAI API (~$1/event for content generation)
- **Database**: PostgreSQL with advanced relationship tracking
- **Integrations**: Direct platform API integrations

## Current Workflow
```
React Frontend → Node.js/Express API → PostgreSQL Database → OpenAI APIs → Platform APIs → Multi-Platform Distribution
```

## Key Files & Documentation

- `PROJECT_OVERVIEW.md` - Goals, objectives, market opportunity
- `REQUIREMENTS.md` - Functional/non-functional requirements, user stories, acceptance criteria
- `MARKET_RESEARCH.md` - Competitive analysis, target market
- `TECHNICAL_DECISIONS.md` - Architecture choices, rejected alternatives
- `IMPLEMENTATION_STATUS.md` - Current progress, debugging status  
- `FUTURE_ROADMAP.md` - Phase 2-4 expansion plans

## Database Schema

### Core Tables
- **events**: Main event data with themes, descriptions, and AI content
- **venues**: Venue management with full address information
- **event_distributions**: Platform posting status tracking
- **event_rsvps**: RSVP management with newsletter signup tracking
- **platform_configs**: API credentials and platform settings
- **ai_generations**: AI usage tracking for cost management

### Event Data Structure:
- Event Date/Time (ISO timestamp)
- Venue relationship (linked to venues table)
- Theme and AI-generated content
- Manual overrides and customizations
- Distribution status across platforms

## Application Components

### Backend API Routes
1. **Events API** - CRUD operations, calendar views, bulk operations
2. **Venues API** - Venue management and location data
3. **AI API** - Theme generation, image creation, chat interface
4. **Distribution API** - Platform posting and status tracking
5. **RSVP API** - Event registration and location reveal
6. **Config API** - Settings and platform configuration management

### Frontend Components
1. **EventCreator** - Multi-step event creation workflow
2. **EventManagement** - Calendar and list views with filtering
3. **AIThemeGenerator** - Interactive AI theme and image generation
4. **ConfigurationScreen** - Settings management interface

## Development Commands

### Backend Development
```bash
# Install dependencies
cd backend && npm install

# Database setup
psql -U postgres -f src/database/schema.sql

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### Frontend Development
```bash
# Install dependencies
cd frontend && npm install

# Start development server
npm start

# Build for production
npm run build
```

### Testing & Debugging
- **Backend API**: Test endpoints at `http://localhost:3001/api/`
- **Database**: Connect via PostgreSQL client to inspect data
- **OpenAI Integration**: Monitor API usage and costs via OpenAI dashboard
- **Platform APIs**: Test individual platform integrations via backend routes

## Privacy & Security Notes

- **Self-hosted approach**: Complete data sovereignty for sensitive community
- **Location gating**: Venue details controlled through RSVP system
- **SSL/TLS**: All communications encrypted
- **API security**: Rate limiting, CORS protection, parameterized database queries
- **Data protection**: Sensitive credentials stored in environment variables

## Next Development Priorities

1. **Platform API Integration** - Replace simulation with real Facebook, Instagram, Eventbrite, Meetup, FetLife APIs
2. **Authentication System** - Add user authentication and role-based access control
3. **Email Service Integration** - Complete RSVP location reveal automation
4. **Enhanced Privacy Features** - General vs specific location display logic
5. **Community features** - Buddy matching, resource sharing, safety systems

## Long-term Vision

Transform from personal automation tool into SaaS platform serving 1,000+ adult/alternative event organizers with $1M+ ARR potential. See `FUTURE_ROADMAP.md` for detailed expansion plans.

## Support Context

This is a privacy-first automation system for a sensitive community. Prioritize:
- Data sovereignty and security
- Community value over pure list building  
- Scalable architecture for future SaaS platform
- Adult-content-appropriate AI prompts and themes