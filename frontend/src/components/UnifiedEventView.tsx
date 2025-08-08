import React from 'react';
import EventList from './EventList';
import EventCalendar from './EventCalendar';
import { EventListItem, CalendarEvent } from '../types/Event';
import './UnifiedEventView.css';

interface UnifiedEventViewProps {
  events: EventListItem[];
  viewMode: 'calendar' | 'list';
  onEventSelect: (eventId: number) => void;
  selectedEvents: number[];
  onSelectionChange: (eventIds: number[]) => void;
}

const UnifiedEventView: React.FC<UnifiedEventViewProps> = ({
  events,
  viewMode,
  onEventSelect,
  selectedEvents,
  onSelectionChange
}) => {
  // Convert EventListItem[] to calendar format for EventCalendar
  const getCalendarEvents = (): {[date: string]: CalendarEvent[]} => {
    const calendarEvents: {[date: string]: CalendarEvent[]} = {};
    
    events.forEach(event => {
      const date = new Date(event.date_time);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!calendarEvents[dateKey]) {
        calendarEvents[dateKey] = [];
      }
      
      const calendarEvent: CalendarEvent = {
        id: event.id,
        title: event.manual_theme_override || event.theme || 'Untitled Event',
        time: event.date_time,
        status: event.status,
        venue: event.venue ? `${event.venue.city}, ${event.venue.state}` : 'TBD',
        rsvp_count: event.rsvp_count || 0
      };
      
      calendarEvents[dateKey].push(calendarEvent);
    });
    
    return calendarEvents;
  };

  // Mock venues data for EventList (this should come from props in real implementation)
  const mockVenues = events
    .filter(event => event.venue)
    .map(event => event.venue!)
    .filter((venue, index, self) => 
      self.findIndex(v => v.id === venue.id) === index
    );

  // Mock filters for EventList
  const mockFilters = {
    sort: 'date_time' as const
  };

  if (viewMode === 'calendar') {
    return (
      <div className="unified-event-view calendar-view">
        <EventCalendar
          events={getCalendarEvents()}
          currentMonth={new Date()}
          onMonthChange={() => {}} // This should be handled by parent in real implementation
          onEventSelect={onEventSelect}
          loading={false}
        />
      </div>
    );
  }

  return (
    <div className="unified-event-view list-view">
      <EventList
        events={events}
        venues={mockVenues}
        loading={false}
        filters={mockFilters}
        onFiltersChange={() => {}} // This should be handled by parent
        onClearFilters={() => {}} // This should be handled by parent
        onEventSelect={onEventSelect}
        selectedEvents={selectedEvents}
        onSelectedEventsChange={onSelectionChange}
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}} // This should be handled by parent
      />
    </div>
  );
};

export default UnifiedEventView;