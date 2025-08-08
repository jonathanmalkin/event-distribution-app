/**
 * Auto-generated TypeScript interfaces from database schema
 * Generated on: 2025-08-08T12:57:51.559Z
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export interface AiGenerations {
  /** Primary key, Default: nextval('ai_generations_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  /** Max length: 20 */
  type: string;
  promptUsed?: string | null;
  result?: string | null;
  tokensUsed?: number | null;
  costCents?: number | null;
  /** Max length: 50 */
  modelUsed?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
}

export interface CreateAiGenerations extends Omit<AiGenerations, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateAiGenerations extends Partial<AiGenerations> {
  id: number;
}

export interface EventDistributions {
  /** Primary key, Default: nextval('event_distributions_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  /** Max length: 50 */
  platform: string;
  /** Max length: 255 */
  platformEventId?: string | null;
  /** Default: 'pending'::character varying, Max length: 20 */
  status?: string | null;
  errorMessage?: string | null;
  postedAt?: Date | null;
  /** Default: now() */
  createdAt?: Date | null;
  platformUrl?: string | null;
  /** Default: '{}'::jsonb */
  metrics?: any | null;
  lastSynced?: Date | null;
}

export interface CreateEventDistributions extends Omit<EventDistributions, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateEventDistributions extends Partial<EventDistributions> {
  id: number;
}

export interface EventRsvps {
  /** Primary key, Default: nextval('event_rsvps_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  /** Max length: 255 */
  email: string;
  /** Max length: 255 */
  name: string;
  /** Max length: 20 */
  phone?: string | null;
  /** Default: false */
  newsletterSignup?: boolean | null;
  /** Default: false */
  locationRevealed?: boolean | null;
  /** Default: now() */
  createdAt?: Date | null;
}

export interface CreateEventRsvps extends Omit<EventRsvps, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateEventRsvps extends Partial<EventRsvps> {
  id: number;
}

export interface Events {
  /** Primary key, Default: nextval('events_id_seq'::regclass) */
  id?: number;
  /** Max length: 255 */
  title?: string | null;
  /** Max length: 255 */
  theme?: string | null;
  description?: string | null;
  dateTime: Date;
  venueId?: number | null;
  bannerImageUrl?: string | null;
  /** Max length: 255 */
  aiGeneratedTheme?: string | null;
  aiGeneratedDescription?: string | null;
  /** Max length: 255 */
  manualThemeOverride?: string | null;
  /** Default: 'draft'::character varying, Max length: 20 */
  status?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
  /** Max length: 255 */
  legacyGeneralLocation?: string | null;
  legacySpecificLocation?: string | null;
  wordpressEventId?: number | null;
  /** Max length: 500 */
  wordpressUrl?: string | null;
  importedAt?: Date | null;
  lastSyncedAt?: Date | null;
  wordpressModifiedAt?: Date | null;
  /** Default: 'synced'::character varying, Max length: 20 */
  syncStatus?: string | null;
  organizerId?: number | null;
}

export interface CreateEvents extends Omit<Events, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateEvents extends Partial<Events> {
  id: number;
}

/**
 * Tracks conflicts between WordPress and local event data
 */
export interface ImportConflicts {
  /** Primary key, Default: nextval('import_conflicts_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  wordpressId: number;
  /** Max length: 50 */
  conflictType: string;
  localValue?: any | null;
  wordpressValue?: any | null;
  /** Default: 'manual'::character varying, Max length: 20 */
  strategy?: string | null;
  /** Default: 'pending'::character varying, Max length: 20 */
  resolution?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
  resolvedAt?: Date | null;
  /** Max length: 100 */
  resolvedBy?: string | null;
}

export interface CreateImportConflicts extends Omit<ImportConflicts, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateImportConflicts extends Partial<ImportConflicts> {
  id: number;
}

export interface Organizers {
  /** Primary key, Default: nextval('organizers_id_seq'::regclass) */
  id?: number;
  /** Max length: 255 */
  name: string;
  /** Max length: 255 */
  email?: string | null;
  /** Max length: 20 */
  phone?: string | null;
  /** Max length: 255 */
  website?: string | null;
  description?: string | null;
  /** Default: false */
  isDefault?: boolean | null;
  wordpressOrganizerId?: number | null;
  /** Max length: 255 */
  wordpressSiteUrl?: string | null;
  importedAt?: Date | null;
  /** Default: true */
  isActive?: boolean | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
}

export interface CreateOrganizers extends Omit<Organizers, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateOrganizers extends Partial<Organizers> {
  id: number;
}

export interface PlatformConfigs {
  /** Primary key, Default: nextval('platform_configs_id_seq'::regclass) */
  id?: number;
  /** Max length: 50 */
  platform: string;
  configData: any;
  /** Default: true */
  isActive?: boolean | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
}

export interface CreatePlatformConfigs extends Omit<PlatformConfigs, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdatePlatformConfigs extends Partial<PlatformConfigs> {
  id: number;
}

/**
 * Enhanced event details retrieved from platforms
 */
export interface PlatformEventDetails {
  /** Primary key, Default: nextval('platform_event_details_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  /** Max length: 50 */
  platform: string;
  /** Max length: 255 */
  platformEventId: string;
  platformUrl?: string | null;
  /** Max length: 500 */
  title?: string | null;
  description?: string | null;
  platformCreatedAt?: Date | null;
  platformUpdatedAt?: Date | null;
  /** Default: '{}'::jsonb */
  metrics?: any | null;
  /** Default: '{}'::jsonb */
  rawData?: any | null;
  /** Default: now() */
  lastSynced?: Date | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
}

export interface CreatePlatformEventDetails extends Omit<PlatformEventDetails, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdatePlatformEventDetails extends Partial<PlatformEventDetails> {
  id: number;
}

/**
 * Tracking for platform synchronization operations
 */
export interface PlatformSyncJobs {
  /** Primary key, Default: nextval('platform_sync_jobs_id_seq'::regclass) */
  id?: number;
  eventId?: number | null;
  /** Max length: 50 */
  platform: string;
  /** Max length: 20 */
  syncType: string;
  /** Default: 'pending'::character varying, Max length: 20 */
  status?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  /** Default: '{}'::jsonb */
  syncData?: any | null;
  /** Default: now() */
  createdAt?: Date | null;
}

export interface CreatePlatformSyncJobs extends Omit<PlatformSyncJobs, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdatePlatformSyncJobs extends Partial<PlatformSyncJobs> {
  id: number;
}

/**
 * Encrypted storage for platform API tokens and credentials
 */
export interface PlatformTokens {
  /** Primary key, Default: nextval('platform_tokens_id_seq'::regclass) */
  id?: number;
  /** Max length: 50 */
  platform: string;
  /** Max length: 50 */
  tokenType: string;
  encryptedToken: string;
  expiresAt?: Date | null;
  /** Default: true */
  isActive?: boolean | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
}

export interface CreatePlatformTokens extends Omit<PlatformTokens, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdatePlatformTokens extends Partial<PlatformTokens> {
  id: number;
}

/**
 * Historical record of all sync operations
 */
export interface SyncHistory {
  /** Primary key, Default: nextval('sync_history_id_seq'::regclass) */
  id?: number;
  /** Max length: 20 */
  syncType: string;
  /** Default: 0 */
  eventsProcessed?: number | null;
  /** Default: 0 */
  eventsImported?: number | null;
  /** Default: 0 */
  eventsUpdated?: number | null;
  /** Default: 0 */
  conflictsDetected?: number | null;
  /** Default: 0 */
  errorsEncountered?: number | null;
  durationSeconds?: number | null;
  /** Max length: 50 */
  triggeredBy?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
}

export interface CreateSyncHistory extends Omit<SyncHistory, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateSyncHistory extends Partial<SyncHistory> {
  id: number;
}

export interface Venues {
  /** Primary key, Default: nextval('venues_id_seq'::regclass) */
  id?: number;
  /** Max length: 255 */
  name: string;
  /** Max length: 255 */
  streetAddress: string;
  /** Max length: 100 */
  city: string;
  /** Max length: 50 */
  state: string;
  /** Max length: 20 */
  zipCode: string;
  /** Default: true */
  isActive?: boolean | null;
  /** Default: now() */
  createdAt?: Date | null;
  /** Default: now() */
  updatedAt?: Date | null;
}

export interface CreateVenues extends Omit<Venues, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateVenues extends Partial<Venues> {
  id: number;
}

/**
 * Tracks WordPress import jobs and their progress
 */
export interface WordpressImports {
  /** Primary key, Default: nextval('wordpress_imports_id_seq'::regclass) */
  id?: number;
  /** Max length: 50 */
  jobId: string;
  /** Default: 'queued'::character varying, Max length: 20 */
  status?: string | null;
  /** Default: 0 */
  progress?: number | null;
  options: any;
  result?: any | null;
  errorMessage?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface CreateWordpressImports extends Omit<WordpressImports, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateWordpressImports extends Partial<WordpressImports> {
  id: number;
}

/**
 * Maps WordPress venue IDs to local venue IDs
 */
export interface WordpressVenues {
  /** Primary key, Default: nextval('wordpress_venues_id_seq'::regclass) */
  id?: number;
  localVenueId?: number | null;
  wordpressVenueId: number;
  /** Max length: 255 */
  wordpressName?: string | null;
  /** Max length: 500 */
  wordpressAddress?: string | null;
  /** Default: now() */
  createdAt?: Date | null;
}

export interface CreateWordpressVenues extends Omit<WordpressVenues, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateWordpressVenues extends Partial<WordpressVenues> {
  id: number;
}

/**
 * Database relationship types
 */

export interface EventsWithRelations extends Events {
  venues?: Venues;
  organizers?: Organizers;
}

export interface EventDistributionsWithRelations extends EventDistributions {
  events?: Events;
}

export interface EventRsvpsWithRelations extends EventRsvps {
  events?: Events;
}

export interface AiGenerationsWithRelations extends AiGenerations {
  events?: Events;
}

export interface PlatformSyncJobsWithRelations extends PlatformSyncJobs {
  events?: Events;
}

export interface PlatformEventDetailsWithRelations extends PlatformEventDetails {
  events?: Events;
}

export interface WordpressVenuesWithRelations extends WordpressVenues {
  venues?: Venues;
}

export interface ImportConflictsWithRelations extends ImportConflicts {
  events?: Events;
}
