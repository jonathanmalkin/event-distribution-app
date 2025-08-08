import React from 'react';
import { EventListItem } from '../types/Event';
import './UpcomingEvents.css';

interface UpcomingEventsProps {
  events: EventListItem[];
  onEventAction: (eventId: number, action: string) => void;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events, onEventAction }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#28a745';
      case 'scheduled': return '#ffc107';
      case 'draft': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#007bff';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Published';
      case 'scheduled': return 'Scheduled';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (events.length === 0) {
    return (
      <div className="upcoming-events-empty">
        <div className="empty-icon">📅</div>
        <div className="empty-title">No upcoming events</div>
        <div className="empty-description">
          Create your first event to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="upcoming-events">
      <div className="events-scroll">
        {events.map(event => (
          <div key={event.id} className="upcoming-event-card">
            <div className="event-time">
              <div className="event-date">{formatDate(event.date_time)}</div>
              <div className="event-clock">{formatTime(event.date_time)}</div>
            </div>
            
            <div className="event-info">
              <div className="event-title">
                {event.manual_theme_override || event.theme || 'Untitled Event'}
              </div>
              <div className="event-venue">
                {event.venue ? `${event.venue.city}, ${event.venue.state}` : 'Venue TBD'}
              </div>
              <div className="event-meta">
                <span 
                  className="event-status"
                  style={{ color: getStatusColor(event.status) }}
                >
                  {getStatusLabel(event.status)}
                </span>
                <span className="event-rsvp">
                  {event.rsvp_count || 0} RSVPs
                </span>
              </div>
            </div>

            <div className="event-actions">
              <button
                className="action-btn edit"
                onClick={() => onEventAction(event.id, 'edit')}
                title="Edit Event"
              >
                ✏️
              </button>
              <button
                className="action-btn duplicate"
                onClick={() => onEventAction(event.id, 'duplicate')}
                title="Duplicate Event"
              >
                📋
              </button>
              <button
                className="action-btn distribute"
                onClick={() => onEventAction(event.id, 'distribute')}
                title="Redistribute"
              >
                🔄
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingEvents;