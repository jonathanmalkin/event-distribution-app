import React, { useState, useEffect } from 'react';
import EventCalendar from './EventCalendar';
import EventList from './EventList';
import EventDetail from './EventDetail';
import ConfigurationScreen from './ConfigurationScreen';
import { 
  EventListItem, 
  EventDetail as EventDetailType, 
  EventsResponse, 
  CalendarEvent, 
  Venue, 
  Filters 
} from '../types/Event';
import './EventManagement.css';

interface EventManagementProps {
  onCreateEvent: () => void;
  onImportEvents: () => void;
}

const EventManagement: React.FC<EventManagementProps> = ({ onCreateEvent, onImportEvents }) => {
  // Get initial state from URL parameters
  const getInitialView = (): 'calendar' | 'list' => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    return (view === 'calendar' || view === 'list') ? view : 'calendar';
  };

  const getInitialMonth = (): Date => {
    const params = new URLSearchParams(window.location.search);
    const month = params.get('month');
    if (month) {
      const date = new Date(month);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  };

  const [view, setView] = useState<'calendar' | 'list'>(getInitialView);
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventDetailType | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    sort: 'date_time'
  });
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth);
  const [calendarEvents, setCalendarEvents] = useState<{[date: string]: CalendarEvent[]}>({});
  
  // Venues for filtering
  const [venues, setVenues] = useState<Venue[]>([]);

  // Update URL when view or month changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    params.set('month', currentMonth.toISOString().slice(0, 7)); // YYYY-MM format
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [view, currentMonth]);

  useEffect(() => {
    loadVenues();
    if (view === 'calendar') {
      loadCalendarEvents();
    } else {
      loadEvents();
    }
  }, [view, currentPage, filters, currentMonth]);

  const loadVenues = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/venues');
      if (response.ok) {
        const venuesData = await response.json();
        setVenues(venuesData);
      }
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...filters
      });

      const response = await fetch(`http://localhost:3001/api/events?${params}`);
      if (response.ok) {
        const data: EventsResponse = await response.json();
        setEvents(data.events);
        setTotalPages(data.pagination.pages);
      } else {
        console.error('Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JS months are 0-indexed
      
      const response = await fetch(`http://localhost:3001/api/events/calendar/${year}/${month}`);
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data);
      } else {
        console.error('Failed to load calendar events');
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (eventId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setSelectedEvent(eventData);
        setShowEventDetail(true);
      } else {
        console.error('Failed to load event details');
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = async (eventId: number, updates: Partial<EventDetailType>) => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Refresh the current view
        if (view === 'calendar') {
          loadCalendarEvents();
        } else {
          loadEvents();
        }
        
        // Update selected event if it's currently displayed
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent({ ...selectedEvent, ...updates });
        }
      } else {
        console.error('Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleEventRepost = async (eventId: number, platforms: string[]) => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platforms }),
      });

      if (response.ok) {
        // Refresh the event data to show updated status
        handleEventSelect(eventId);
        if (view === 'list') {
          loadEvents();
        }
      } else {
        console.error('Failed to repost event');
      }
    } catch (error) {
      console.error('Error reposting event:', error);
    }
  };

  const handleEventDelete = async (eventId: number) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Event deleted successfully');
        setShowEventDetail(false);
        setSelectedEvent(null);
        
        // Refresh the current view
        if (view === 'calendar') {
          loadCalendarEvents();
        } else {
          loadEvents();
        }
      } else {
        const error = await response.json();
        alert(`Failed to delete event: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedEvents.length === 0) {
      alert('Please select events first');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/events/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          event_ids: selectedEvents,
          data
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedEvents([]);
        
        // Refresh the current view
        if (view === 'calendar') {
          loadCalendarEvents();
        } else {
          loadEvents();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action');
    }
  };

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({ sort: 'date_time' });
    setCurrentPage(1);
  };

  const handleImportFromWordPress = async () => {
    if (!window.confirm('Import events from WordPress? This will import events from your WordPress site.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/import/wordpress/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Import completed: ${result.totalImported || 0} events imported from WordPress.`);
        
        // Reload events
        if (view === 'calendar') {
          loadCalendarEvents();
        } else {
          loadEvents();
        }
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error || 'WordPress import failed'}`);
      }
    } catch (error) {
      console.error('Error importing from WordPress:', error);
      alert('Failed to import from WordPress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-management">
      <div className="event-management-header">
        <div className="header-left">
          <h1>Event Management</h1>
          <div className="view-switcher">
            <button 
              className={`view-btn ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              📅 Calendar
            </button>
            <button 
              className={`view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              📋 List
            </button>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="create-event-btn"
            onClick={onCreateEvent}
            title="Create a new event"
          >
            ➕ Create Event
          </button>
          
          <button 
            className="import-btn"
            onClick={handleImportFromWordPress}
            disabled={loading}
            title="Import events from WordPress site"
          >
            📥 Import from WordPress
          </button>
          
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="Application Settings"
          >
            ⚙️
          </button>
          
          {view === 'list' && selectedEvents.length > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">{selectedEvents.length} selected</span>
              <button 
                className="bulk-btn"
                onClick={() => {
                  const platforms = ['wordpress', 'facebook', 'instagram', 'eventbrite'];
                  handleBulkAction('repost', { platforms });
                }}
              >
                Bulk Repost
              </button>
              <button 
                className="bulk-btn danger"
                onClick={() => {
                  if (window.confirm(`Delete ${selectedEvents.length} selected events?`)) {
                    handleBulkAction('delete');
                  }
                }}
              >
                Bulk Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="event-management-content">
        {view === 'calendar' ? (
          <EventCalendar
            events={calendarEvents}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onEventSelect={handleEventSelect}
            loading={loading}
          />
        ) : (
          <EventList
            events={events}
            venues={venues}
            loading={loading}
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            onEventSelect={handleEventSelect}
            selectedEvents={selectedEvents}
            onSelectedEventsChange={setSelectedEvents}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {showEventDetail && selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setShowEventDetail(false)}
          onUpdate={handleEventUpdate}
          onRepost={handleEventRepost}
          onDelete={handleEventDelete}
        />
      )}
      
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="settings-header">
              <h2>Application Settings</h2>
              <button 
                className="settings-close-btn"
                onClick={() => setShowSettings(false)}
                title="Close Settings"
              >
                ✕
              </button>
            </div>
            <ConfigurationScreen onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;