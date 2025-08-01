import React, { useState } from 'react';
import './EventForm.css';

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
  description?: string;
  manual_theme_override?: string;
}

interface EventFormErrors {
  date_time?: string;
  venue_id?: string;
  description?: string;
  manual_theme_override?: string;
}

interface EventFormProps {
  initialData: Event;
  onSubmit: (data: Event) => void;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState<Event>(initialData);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showNewVenueForm, setShowNewVenueForm] = useState(false);
  const [newVenue, setNewVenue] = useState<Partial<Venue>>({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  // Default to next Sunday 11am
  const getDefaultDateTime = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    nextSunday.setHours(11, 0, 0, 0);
    
    return nextSunday.toISOString().slice(0, 16);
  };

  React.useEffect(() => {
    if (!formData.date_time) {
      setFormData(prev => ({
        ...prev,
        date_time: getDefaultDateTime()
      }));
    }
    
    // Load venues
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      console.log('Fetching venues...');
      const response = await fetch('http://localhost:3001/api/venues');
      console.log('Venues response status:', response.status);
      if (response.ok) {
        const venuesData = await response.json();
        console.log('Venues loaded:', venuesData.length, 'venues');
        console.log('First venue:', venuesData[0]);
        setVenues(venuesData);
      } else {
        console.error('Failed to fetch venues:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'venue_id') {
      const venueId = value ? parseInt(value) : 0;
      const selectedVenue = venues.find(v => v.id === venueId);
      setFormData(prev => ({
        ...prev,
        venue_id: venueId,
        venue: selectedVenue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof EventFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleNewVenueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewVenue(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createNewVenue = async () => {
    try {
      console.log('Creating venue:', newVenue);
      
      // Validate required fields
      if (!newVenue.name || !newVenue.street_address || !newVenue.city || !newVenue.state || !newVenue.zip_code) {
        alert('Please fill in all required venue fields');
        return;
      }
      
      const response = await fetch('http://localhost:3001/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newVenue)
      });

      console.log('Venue creation response status:', response.status);

      if (response.ok) {
        const createdVenue = await response.json();
        console.log('Venue created successfully:', createdVenue);
        setVenues(prev => [...prev, createdVenue]);
        setFormData(prev => ({
          ...prev,
          venue_id: createdVenue.id,
          venue: createdVenue
        }));
        setShowNewVenueForm(false);
        setNewVenue({
          name: '',
          street_address: '',
          city: '',
          state: '',
          zip_code: ''
        });
        alert('Venue created successfully!');
      } else {
        const errorText = await response.text();
        console.error('Failed to create venue:', response.status, errorText);
        alert(`Failed to create venue: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating venue:', error);
      alert('Failed to create venue. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors: EventFormErrors = {};

    if (!formData.date_time) {
      newErrors.date_time = 'Date and time are required';
    }


    if (!formData.venue_id || formData.venue_id === 0) {
      newErrors.venue_id = 'Please select a venue or create a new one';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="event-form">
      <h2>Create New Event</h2>
      <p className="form-description">
        Enter the basic details for your Kinky Coffee event. AI will generate themes and content based on this information.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date_time">
            Date & Time
            <span className="required">*</span>
          </label>
          <input
            type="datetime-local"
            id="date_time"
            name="date_time"
            value={formData.date_time}
            onChange={handleChange}
            className={errors.date_time ? 'error' : ''}
          />
          {errors.date_time && <span className="error-message">{errors.date_time}</span>}
          <small className="field-help">Defaults to next Sunday at 11am</small>
        </div>


        <div className="form-group">
          <label htmlFor="venue_id">
            Venue
            <span className="required">*</span>
          </label>
          <div className="venue-selection">
            <select
              id="venue_id"
              name="venue_id"
              value={formData.venue_id || ''}
              onChange={handleChange}
              className={errors.venue_id ? 'error' : ''}
            >
              <option value="">Select a venue...</option>
              {venues.length === 0 && <option value="" disabled>Loading venues...</option>}
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.city}, {venue.state}
                </option>
              ))}
            </select>
            {venues.length > 0 && <small className="venues-debug">Found {venues.length} venues</small>}
            <button 
              type="button" 
              onClick={() => setShowNewVenueForm(!showNewVenueForm)}
              className="btn-secondary add-venue-btn"
            >
              {showNewVenueForm ? 'Cancel' : 'Add New Venue'}
            </button>
          </div>
          {errors.venue_id && <span className="error-message">{errors.venue_id}</span>}
          <small className="field-help">Specific address revealed only after RSVP. Public display will show "{formData.venue ? `${formData.venue.city}, ${formData.venue.state}` : 'City, State'}"</small>
        </div>

        {formData.venue && (
          <div className="selected-venue-info">
            <h4>Selected Venue Details:</h4>
            <p><strong>{formData.venue.name}</strong></p>
            <p>{formData.venue.street_address}</p>
            <p>{formData.venue.city}, {formData.venue.state} {formData.venue.zip_code}</p>
            <div className="public-display-info">
              <p><strong>Public Display:</strong> {formData.venue.city}, {formData.venue.state}</p>
              <small>Only city and state will be shown publicly until RSVP</small>
            </div>
          </div>
        )}

        {showNewVenueForm && (
          <div className="new-venue-form">
            <h4>Add New Venue</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new_venue_name">Venue Name *</label>
                <input
                  type="text"
                  id="new_venue_name"
                  name="name"
                  value={newVenue.name}
                  onChange={handleNewVenueChange}
                  placeholder="e.g., Victrola Coffee Roasters"
                />
              </div>
              <div className="form-group">
                <label htmlFor="new_venue_street">Street Address *</label>
                <input
                  type="text"
                  id="new_venue_street"
                  name="street_address"
                  value={newVenue.street_address}
                  onChange={handleNewVenueChange}
                  placeholder="123 Main St"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new_venue_city">City *</label>
                <input
                  type="text"
                  id="new_venue_city"
                  name="city"
                  value={newVenue.city}
                  onChange={handleNewVenueChange}
                  placeholder="Seattle"
                />
              </div>
              <div className="form-group">
                <label htmlFor="new_venue_state">State *</label>
                <input
                  type="text"
                  id="new_venue_state"
                  name="state"
                  value={newVenue.state}
                  onChange={handleNewVenueChange}
                  placeholder="WA"
                />
              </div>
              <div className="form-group">
                <label htmlFor="new_venue_zip">Zip Code *</label>
                <input
                  type="text"
                  id="new_venue_zip"
                  name="zip_code"
                  value={newVenue.zip_code}
                  onChange={handleNewVenueChange}
                  placeholder="98101"
                />
              </div>
            </div>
            <div className="new-venue-actions">
              <button type="button" onClick={createNewVenue} className="btn-primary">
                Create Venue
              </button>
              <button type="button" onClick={() => setShowNewVenueForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">
            Event Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Describe your event, special activities, or any details you'd like attendees to know about..."
            rows={4}
          />
          <small className="field-help">This will be included in event listings and announcements</small>
        </div>

        <div className="form-group">
          <label htmlFor="manual_theme_override">
            Manual Theme Override (Optional)
          </label>
          <input
            type="text"
            id="manual_theme_override"
            name="manual_theme_override"
            value={formData.manual_theme_override || ''}
            onChange={handleChange}
            placeholder="e.g., Holiday Spice Gathering, Spring Awakening"
          />
          <small className="field-help">Leave blank to generate AI theme based on date and season</small>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Continue to AI Generation
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;