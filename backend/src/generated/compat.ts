/**
 * Compatibility layer for existing imports
 * Maintains backward compatibility with existing Event.ts imports
 */

export type Event = Events;
export type CreateEvent = CreateEvents;
export type UpdateEvent = UpdateEvents;

export type Venue = Venues;
export type CreateVenue = CreateVenues;
export type UpdateVenue = UpdateVenues;

export type Organizer = Organizers;
export type CreateOrganizer = CreateOrganizers;
export type UpdateOrganizer = UpdateOrganizers;

// Re-export all generated types
export * from "./database-types";