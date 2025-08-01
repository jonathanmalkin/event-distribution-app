import React from 'react';
import './EventPreview.css';

interface Venue {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Event {
  date_time: string;
  venue_id: number;
  venue?: Venue;
  theme?: string;
  description?: string;
  banner_image_url?: string;
}

interface EventPreviewProps {
  event: Event;
  onPublish: () => void;
  onBack: () => void;
  loading: boolean;
}

const EventPreview: React.FC<EventPreviewProps> = ({ event, onPublish, onBack, loading }) => {
  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const { date, time } = formatDateTime(event.date_time);

  const distributionPlatforms = [
    { name: 'WordPress', description: 'Your main event website' },
    { name: 'Facebook', description: 'Event page + post on your page' },
    { name: 'Instagram', description: 'Visual post with event details' },
    { name: 'Eventbrite', description: 'Professional ticketing platform' },
    { name: 'Meetup', description: 'Community discovery platform' },
    { name: 'FetLife', description: 'Kink community platform' }
  ];

  return (
    <div className="event-preview">
      <h2>Event Preview</h2>
      <p className="preview-description">
        Review your event before publishing to all platforms. The specific location will only be revealed after RSVP.
      </p>

      <div className="preview-content">
        <div className="event-card">
          {event.banner_image_url && (
            <div className="event-image">
              <img src={event.banner_image_url} alt="Event banner" />
            </div>
          )}
          
          <div className="event-details">
            <h3 className="event-title">{event.theme}</h3>
            
            <div className="event-meta">
              <div className="meta-item">
                <strong>Date:</strong> {date}
              </div>
              <div className="meta-item">
                <strong>Time:</strong> {time}
              </div>
              <div className="meta-item">
                <strong>Location:</strong> {event.venue ? `${event.venue.city}, ${event.venue.state}` : 'Location TBD'}
                <small className="location-note">
                  (Specific address provided after RSVP)
                </small>
              </div>
            </div>

            <div className="event-description">
              <p>{event.description}</p>
            </div>

            <div className="rsvp-section">
              <button className="btn-rsvp" disabled>
                RSVP Required for Location
              </button>
              <p className="rsvp-note">
                This button will be functional on all platforms and will trigger 
                the location reveal system.
              </p>
            </div>
          </div>
        </div>

        <div className="distribution-info">
          <h4>Will be published to:</h4>
          <div className="platform-list">
            {distributionPlatforms.map((platform, index) => (
              <div key={index} className="platform-item">
                <div className="platform-name">{platform.name}</div>
                <div className="platform-description">{platform.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="privacy-info">
          <h4>Privacy & Location Handling:</h4>
          <ul>
            <li>All platforms will show only: "{event.venue ? `${event.venue.city}, ${event.venue.state}` : 'City, State'}"</li>
            {event.venue && (
              <li>Specific location is protected: "{event.venue.name} - {event.venue.street_address}, {event.venue.city}"</li>
            )}
            <li>Location revealed via email after RSVP confirmation</li>
            <li>Newsletter signup optional during RSVP process</li>
          </ul>
          
          {event.venue && (
            <div className="venue-details">
              <h5>Protected Venue Information:</h5>
              <p><strong>{event.venue.name}</strong></p>
              <p>{event.venue.street_address}</p>
              <p>{event.venue.city}, {event.venue.state} {event.venue.zip_code}</p>
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button onClick={onBack} className="btn-secondary" disabled={loading}>
          Back to AI Generation
        </button>
        <button 
          onClick={onPublish}
          disabled={loading}
          className="btn-primary btn-publish"
        >
          {loading ? 'Publishing...' : 'Publish to All Platforms'}
        </button>
      </div>

      {loading && (
        <div className="publishing-status">
          <p>Creating event and distributing to all platforms...</p>
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default EventPreview;