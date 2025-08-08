# WordPress Import Feature Design

## Overview
Design for importing events from WordPress (The Events Calendar) into the local Event Distribution App database, enabling bidirectional synchronization and centralized event management.

## Feature Requirements

### Core Functionality
- **Import WordPress events** from The Events Calendar plugin
- **Bidirectional sync** with conflict resolution
- **Incremental updates** to avoid full reimports
- **Venue mapping** and creation
- **Image download** and local storage
- **Metadata preservation** including custom fields
- **Status synchronization** (draft, published, cancelled)

### Business Logic
- Import events from last 6 months and next 12 months (configurable)
- Detect and resolve conflicts between local and WordPress versions
- Maintain WordPress event ID mapping for future updates
- Handle venue creation/matching intelligently
- Preserve original WordPress URLs and metadata

## Data Mapping Analysis

### WordPress Event Structure (The Events Calendar)
```json
{
  "id": 434,
  "title": "Event Title",
  "description": "HTML content",
  "status": "publish|draft|private",
  "start_date": "2025-07-29T19:00:00",
  "end_date": "2025-07-29T21:00:00",
  "all_day": false,
  "timezone": "America/Los_Angeles",
  "url": "https://kinky.coffee/event/slug/",
  "featured_media": 123,
  "venue": {
    "id": 45,
    "venue": "Venue Name",
    "address": "Street Address",
    "city": "City",
    "state": "State",
    "zip": "ZIP",
    "country": "Country"
  },
  "organizer": {
    "id": 12,
    "organizer": "Organizer Name",
    "email": "email@domain.com"
  },
  "meta": {
    "_kinky_coffee_event_id": "52",
    "_kinky_coffee_general_location": "Capitol Hill",
    "_kinky_coffee_rsvp_required": "true"
  }
}
```

### Local Event Structure
```typescript
interface Event {
  id?: number;
  theme?: string;
  description?: string;
  date_time: Date;
  venue_id: number;
  banner_image_url?: string;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  // WordPress integration fields
  wordpress_event_id?: number;
  wordpress_url?: string;
  imported_at?: Date;
  last_synced_at?: Date;
}
```

## Architecture Design

### 1. WordPress Import Service

```typescript
interface WordPressImportService {
  // Core import methods
  importEvents(options?: ImportOptions): Promise<ImportResult>;
  importSingleEvent(wordpressId: number): Promise<Event>;
  syncEvent(eventId: number): Promise<SyncResult>;
  
  // Conflict resolution
  resolveConflicts(conflicts: EventConflict[]): Promise<void>;
  detectConflicts(): Promise<EventConflict[]>;
  
  // Venue management
  importVenues(): Promise<Venue[]>;
  matchOrCreateVenue(wpVenue: WordPressVenue): Promise<number>;
  
  // Media handling
  downloadEventImage(mediaId: number): Promise<string>;
  syncEventImages(): Promise<void>;
}

interface ImportOptions {
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeImages?: boolean;
  conflictResolution?: 'local' | 'wordpress' | 'manual';
  dryRun?: boolean;
  statusFilter?: string[];
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  conflicts: EventConflict[];
  errors: ImportError[];
  venuesCreated: number;
  imagesDownloaded: number;
}
```

### 2. Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WordPress     │    │  Import Service  │    │ Local Database │
│ Events Calendar │◄──►│                  │◄──►│                │
└─────────────────┘    │  - Fetch Events  │    └─────────────────┘
                       │  - Map Data      │
                       │  - Resolve Conf. │
                       │  - Download Imgs │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Conflict Manager │
                       │ - Compare Events │
                       │ - Apply Strategy │
                       │ - Log Changes    │
                       └──────────────────┘
```

### 3. Conflict Resolution Strategy

#### Conflict Detection Algorithm
```typescript
class ConflictDetector {
  detectConflicts(localEvent: Event, wpEvent: WordPressEvent): EventConflict[] {
    const conflicts: EventConflict[] = [];
    
    // Content conflicts
    if (localEvent.theme !== wpEvent.title.rendered) {
      conflicts.push({
        type: 'theme',
        local: localEvent.theme,
        wordpress: wpEvent.title.rendered,
        lastModified: { local: localEvent.updated_at, wp: wpEvent.modified }
      });
    }
    
    // Date conflicts
    if (localEvent.date_time !== new Date(wpEvent.start_date)) {
      conflicts.push({
        type: 'datetime',
        local: localEvent.date_time,
        wordpress: wpEvent.start_date
      });
    }
    
    return conflicts;
  }
}
```

#### Resolution Strategies
```typescript
enum ConflictStrategy {
  LOCAL_WINS = 'local',           // Keep local version
  WORDPRESS_WINS = 'wordpress',   // Use WordPress version  
  MERGE_LATEST = 'latest',        // Use most recently modified
  MANUAL = 'manual'               // Require manual resolution
}

interface EventConflict {
  eventId: number;
  wordpressId: number;
  conflictType: 'content' | 'venue' | 'image' | 'status' | 'datetime';
  localValue: any;
  wordpressValue: any;
  strategy: ConflictStrategy;
  resolution?: 'resolved' | 'pending';
  lastModified?: { local?: Date; wordpress?: Date };
}
```

### 4. Duplicate Detection

#### Smart Matching Algorithm
```typescript
class EventMatcher {
  findMatches(wpEvent: WordPressEvent): Event[] {
    // Priority matching strategies
    const strategies = [
      this.matchByWordPressId,      // 100% confidence
      this.matchByTitleAndDate,     // 95% confidence  
      this.matchByDateAndVenue,     // 90% confidence
      this.matchByDescriptionHash,  // 80% confidence
      this.matchByFuzzyTitle        // 70% confidence
    ];
    
    for (const strategy of strategies) {
      const matches = strategy(wpEvent);
      if (matches.length > 0) return matches;
    }
    
    return [];
  }
}
```

## API Design

### Backend Endpoints

```typescript
// Import endpoints
POST /api/import/wordpress/events
GET  /api/import/wordpress/status/:jobId
POST /api/import/wordpress/events/:wpEventId
DELETE /api/import/wordpress/events/:eventId

// Sync endpoints  
POST /api/sync/wordpress/events
POST /api/sync/wordpress/events/:eventId
GET  /api/sync/wordpress/conflicts
POST /api/sync/wordpress/resolve-conflict/:conflictId

// Management endpoints
GET  /api/import/wordpress/venues
POST /api/import/wordpress/venues
GET  /api/import/wordpress/history
```

### Import Request/Response

```typescript
// Import request
interface ImportRequest {
  dateRange?: {
    from: string;
    to: string;
  };
  options: {
    includeImages: boolean;
    conflictStrategy: ConflictStrategy;
    dryRun: boolean;
    statusFilter: string[];
  };
}

// Import response
interface ImportResponse {
  jobId: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    imported: number;
    updated: number;
    skipped: number;
    conflicts: number;
  };
  errors: ImportError[];
  estimatedCompletion?: string;
}
```

## Frontend Interface Design

### 1. Import Dashboard Component

```typescript
interface ImportDashboardProps {
  onImportStart: (options: ImportOptions) => void;
  importHistory: ImportJob[];
  activeJobs: ImportJob[];
}

// Features:
// - Date range picker for import scope
// - Conflict resolution strategy selection
// - Dry run toggle for testing
// - Real-time progress tracking
// - Import history with filtering
// - Conflict resolution interface
```

### 2. Import Configuration Screen

**Import Options Panel:**
- Date Range: "Last 6 months" | "Custom range"
- Include Images: Toggle with storage warning
- Conflict Strategy: Dropdown with explanations
- Status Filter: Checkboxes (published, draft, private)
- Dry Run: Toggle with explanation

**Venue Mapping Panel:**
- Auto-create missing venues: Toggle
- Manual venue mapping interface
- Duplicate venue detection settings

### 3. Conflict Resolution Interface

```typescript
interface ConflictResolutionProps {
  conflicts: EventConflict[];
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
}

// Features:
// - Side-by-side comparison of local vs WordPress data
// - One-click resolution buttons
// - Bulk resolution options
// - Preview of changes before applying
// - Undo/redo capability
```

## Incremental Sync & Scheduling

### 1. Sync Mechanisms

#### Smart Sync Strategy
```typescript
class IncrementalSyncService {
  async performSync(lastSyncTime?: Date): Promise<SyncResult> {
    const since = lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h default
    
    // Fetch WordPress events modified since last sync
    const wpEvents = await this.fetchWordPressEvents({
      modified_after: since.toISOString(),
      status: ['publish', 'draft', 'private']
    });
    
    // Process each event
    for (const wpEvent of wpEvents) {
      await this.syncSingleEvent(wpEvent);
    }
    
    // Update sync timestamp
    await this.updateLastSyncTime(new Date());
  }
  
  private async syncSingleEvent(wpEvent: WordPressEvent): Promise<void> {
    const localEvent = await this.findLocalEvent(wpEvent.id);
    
    if (!localEvent) {
      // New WordPress event - import it
      await this.importEvent(wpEvent);
    } else if (this.hasChanges(localEvent, wpEvent)) {
      // Event exists but has changes - detect conflicts
      const conflicts = await this.detectConflicts(localEvent, wpEvent);
      if (conflicts.length === 0) {
        await this.updateEvent(localEvent, wpEvent);
      } else {
        await this.handleConflicts(conflicts);
      }
    }
  }
}
```

#### Sync Scheduling Options
```typescript
interface SyncSchedule {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  time?: string; // HH:MM format for daily/weekly
  dayOfWeek?: number; // 0-6 for weekly
  notifications: {
    onSuccess: boolean;
    onConflicts: boolean;
    onErrors: boolean;
  };
}

// Cron job implementation
class SyncScheduler {
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  
  scheduleSync(schedule: SyncSchedule): void {
    if (!schedule.enabled) return;
    
    const cronPattern = this.buildCronPattern(schedule);
    const job = setInterval(() => {
      this.performScheduledSync(schedule);
    }, this.calculateInterval(schedule.frequency));
    
    this.jobs.set('wordpress-sync', job);
  }
}
```

### 2. Change Detection

#### Modification Tracking
```typescript
interface SyncMetadata {
  lastSyncAt: Date;
  wordpressModified: Date;
  localModified: Date;
  conflictCount: number;
  lastConflictAt?: Date;
  syncStatus: 'synced' | 'conflicts' | 'error';
}

// Database schema addition
ALTER TABLE events ADD COLUMN wordpress_event_id INTEGER;
ALTER TABLE events ADD COLUMN wordpress_url VARCHAR(255);
ALTER TABLE events ADD COLUMN last_synced_at TIMESTAMP;
ALTER TABLE events ADD COLUMN wordpress_modified_at TIMESTAMP;
ALTER TABLE events ADD COLUMN sync_status VARCHAR(20) DEFAULT 'synced';

// Conflict tracking table
CREATE TABLE import_conflicts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  wordpress_id INTEGER NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  local_value JSONB,
  wordpress_value JSONB,
  strategy VARCHAR(20) DEFAULT 'manual',
  resolution VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### 3. Background Job Processing

#### Job Queue System
```typescript
interface ImportJob {
  id: string;
  type: 'full_import' | 'incremental_sync' | 'single_event';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  options: ImportOptions;
  result?: ImportResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class JobProcessor {
  private queue: ImportJob[] = [];
  private processing = false;
  
  async enqueueImport(options: ImportOptions): Promise<string> {
    const job: ImportJob = {
      id: generateId(),
      type: 'full_import',
      status: 'queued',
      progress: 0,
      options,
      createdAt: new Date()
    };
    
    this.queue.push(job);
    this.processQueue();
    
    return job.id;
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.processJob(job);
    }
    this.processing = false;
  }
}
```

## Database Schema Updates

### New Tables

```sql
-- WordPress import tracking
CREATE TABLE wordpress_imports (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  options JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- WordPress venues mapping
CREATE TABLE wordpress_venues (
  id SERIAL PRIMARY KEY,
  local_venue_id INTEGER REFERENCES venues(id),
  wordpress_venue_id INTEGER NOT NULL,
  wordpress_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wordpress_venue_id)
);

-- Sync history
CREATE TABLE sync_history (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled', 'import'
  events_processed INTEGER DEFAULT 0,
  events_imported INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  triggered_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updated Tables

```sql
-- Add WordPress integration columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_event_id INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_url VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wordpress_modified_at TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced';

-- Create indexes for performance
CREATE INDEX idx_events_wordpress_id ON events(wordpress_event_id);
CREATE INDEX idx_events_last_synced ON events(last_synced_at);
CREATE INDEX idx_events_sync_status ON events(sync_status);
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic import functionality without conflicts

**Deliverables**:
- WordPress import service with basic event fetching
- Data mapping from WordPress to local schema
- Simple venue matching/creation
- Basic API endpoints for import operations
- Database schema updates

**Success Criteria**:
- Can import WordPress events to local database
- Venues automatically matched or created
- Basic error handling for missing data

### Phase 2: Conflict Resolution (Week 3-4)  
**Goal**: Intelligent conflict detection and resolution

**Deliverables**:
- Conflict detection algorithms
- Multiple resolution strategies
- Conflict resolution UI components
- Manual conflict resolution interface
- Testing with various conflict scenarios

**Success Criteria**:
- Accurately detects all conflict types
- Users can resolve conflicts through UI
- Bulk conflict resolution working
- No data loss during conflict resolution

### Phase 3: Incremental Sync (Week 5-6)
**Goal**: Real-time bidirectional synchronization

**Deliverables**:
- Incremental sync service
- Change detection mechanisms
- Scheduled sync with cron jobs
- Background job processing
- Sync monitoring and logging

**Success Criteria**:
- Only syncs changed events (performance)
- Scheduled syncs run automatically
- Real-time sync status monitoring
- Comprehensive sync history

### Phase 4: UI/UX Polish (Week 7-8)
**Goal**: Production-ready user interface

**Deliverables**:
- Complete import dashboard
- Progress tracking with real-time updates
- Import history and filtering
- Configuration management UI
- Error handling and user feedback

**Success Criteria**:
- Intuitive user interface
- Real-time progress feedback
- Easy conflict resolution workflow
- Comprehensive error messages

## Risk Assessment & Mitigation

### High Risk Items

1. **WordPress API Rate Limits**
   - **Risk**: Import fails due to API throttling
   - **Mitigation**: Implement exponential backoff, batch requests, respect rate limits
   - **Fallback**: Queue system with retry logic

2. **Large Event Volumes**
   - **Risk**: Performance issues with thousands of events
   - **Mitigation**: Paginated imports, background processing, progress tracking
   - **Fallback**: Chunked processing with configurable batch sizes

3. **Data Integrity During Conflicts**
   - **Risk**: Data loss during conflict resolution
   - **Mitigation**: Backup before changes, transaction rollback, audit logging
   - **Fallback**: Manual data recovery from backups

4. **WordPress Schema Changes**
   - **Risk**: The Events Calendar plugin updates break integration
   - **Mitigation**: Version detection, flexible mapping, comprehensive testing
   - **Fallback**: Schema migration tools and backwards compatibility

### Medium Risk Items

1. **Image Storage Costs**: Large banner images consume storage
2. **Sync Performance**: Daily syncs may impact system performance  
3. **User Adoption**: Complex conflict resolution may confuse users
4. **Network Dependencies**: WordPress site downtime affects imports

## Success Metrics

### Technical Metrics
- **Import Speed**: <1 second per event for basic imports
- **Sync Accuracy**: >99% data fidelity between systems
- **Conflict Resolution**: <5% manual interventions required
- **System Performance**: <10% impact on regular operations

### User Experience Metrics
- **Time Savings**: 90%+ reduction in manual event entry
- **User Adoption**: >80% of events come from imports within 3 months
- **Error Rate**: <1% failed imports requiring manual intervention
- **User Satisfaction**: >4.5/5 rating for import functionality

## Future Enhancements

### Advanced Features
- **AI-Powered Conflict Resolution**: Machine learning to predict best resolution strategies
- **Real-time Webhooks**: Instant sync when WordPress events change
- **Multi-site Support**: Import from multiple WordPress installations
- **Advanced Filtering**: Complex query builders for selective imports
- **Automated Categorization**: AI-powered event categorization and tagging

### Integration Opportunities
- **Google Calendar Sync**: Bidirectional sync with Google Calendar
- **CRM Integration**: Connect with customer relationship management systems
- **Analytics Dashboard**: Detailed insights into import patterns and conflicts
- **Mobile App**: Import management through mobile applications

---

## Conclusion

This WordPress import feature design provides a comprehensive solution for bidirectional event synchronization between WordPress (The Events Calendar) and the Event Distribution App. The phased implementation approach ensures minimal risk while delivering maximum value through intelligent conflict resolution, automated syncing, and intuitive user interfaces.

The architecture supports future scalability with its modular design, comprehensive error handling, and extensible conflict resolution strategies. Success will be measured through both technical performance metrics and user adoption rates, ensuring the feature delivers tangible value to event organizers.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze WordPress event data structure and mapping requirements", "status": "completed", "id": "1"}, {"content": "Design import service architecture and data flow", "status": "completed", "id": "2"}, {"content": "Define conflict resolution and duplicate detection strategy", "status": "in_progress", "id": "3"}, {"content": "Design API endpoints and frontend interface", "status": "pending", "id": "4"}, {"content": "Plan incremental sync and scheduling mechanisms", "status": "pending", "id": "5"}, {"content": "Create comprehensive import feature specification", "status": "pending", "id": "6"}]