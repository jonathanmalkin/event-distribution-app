import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import './QuickCreateModal.css';

interface Venue {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface QuickCreateForm {
  date_time: string;
  venue_id: number;
  manual_theme_override?: string;
  platforms: string[];
  auto_publish: boolean;
}

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickCreateForm) => Promise<void>;
  defaultValues?: Partial<QuickCreateForm>;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultValues = {}
}) => {
  const [formData, setFormData] = useState<QuickCreateForm>({
    date_time: '',
    venue_id: 0,
    manual_theme_override: '',
    platforms: ['wordpress', 'facebook', 'eventbrite', 'meetup'],
    auto_publish: true,
    ...defaultValues
  });
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workflowId] = useState(() => `quick_create_${Date.now()}`);

  // Auto-save functionality
  const { saveDraft, clearDraft } = useAutoSave({
    data: formData,
    key: workflowId,
    interval: 15000, // Save every 15 seconds (faster for quick create)
    enabled: isOpen && (formData.date_time !== '' || formData.venue_id !== 0 || formData.manual_theme_override !== '')
  });

  // Get default date/time (next Sunday 11am)
  const getDefaultDateTime = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    nextSunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    nextSunday.setHours(11, 0, 0, 0);
    return nextSunday.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      // Set default date if not provided
      if (!formData.date_time) {
        setFormData(prev => ({
          ...prev,
          date_time: getDefaultDateTime()
        }));
      }
      
      // Load venues
      loadVenues();
    }
  }, [isOpen]);

  const loadVenues = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/venues');
      if (response.ok) {
        const venuesData = await response.json();
        setVenues(venuesData);
        
        // Auto-select first venue if none selected
        if (venuesData.length > 0 && formData.venue_id === 0) {
          setFormData(prev => ({
            ...prev,
            venue_id: venuesData[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date_time) {
      newErrors.date_time = 'Date and time are required';
    } else {
      const eventDate = new Date(formData.date_time);
      const now = new Date();
      if (eventDate <= now) {
        newErrors.date_time = 'Event must be in the future';
      }
    }

    if (formData.venue_id === 0) {
      newErrors.venue_id = 'Please select a venue';
    }

    if (formData.platforms.length === 0) {
      newErrors.platforms = 'Please select at least one platform';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      
      // Clear draft and reset form
      clearDraft();
      onClose();
      
      // Reset form
      setFormData({
        date_time: getDefaultDateTime(),
        venue_id: venues.length > 0 ? venues[0].id : 0,
        manual_theme_override: '',
        platforms: ['wordpress', 'facebook', 'eventbrite', 'meetup'],
        auto_publish: true
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const platformOptions = [
    { key: 'wordpress', name: 'WordPress', icon: '🌐' },
    { key: 'facebook', name: 'Facebook', icon: '📘' },
    { key: 'eventbrite', name: 'Eventbrite', icon: '🎫' },
    { key: 'meetup', name: 'Meetup', icon: '👥' },
    { key: 'instagram', name: 'Instagram', icon: '📸' },
    { key: 'fetlife', name: 'FetLife', icon: '🔗' }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quick-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="title-icon">⚡</span>
            Quick Create Event
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-create-form">
          <div className="form-row">
            <div className="form-group">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => setFormData(prev => ({ ...prev, date_time: e.target.value }))}
                className={errors.date_time ? 'error' : ''}
              />
              {errors.date_time && <span className="error-message">{errors.date_time}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Venue</label>
              <select
                value={formData.venue_id}
                onChange={(e) => setFormData(prev => ({ ...prev, venue_id: parseInt(e.target.value) }))}
                className={errors.venue_id ? 'error' : ''}
              >
                <option value={0}>Select a venue...</option>
                {venues.map(venue => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} - {venue.city}, {venue.state}
                  </option>
                ))}
              </select>
              {errors.venue_id && <span className="error-message">{errors.venue_id}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Theme (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Summer Vibes, Leather & Lace"
                value={formData.manual_theme_override}
                onChange={(e) => setFormData(prev => ({ ...prev, manual_theme_override: e.target.value }))}
              />
              <small className="form-help">Leave blank to use AI-generated theme</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Platforms</label>
              <div className="platform-grid">
                {platformOptions.map(platform => (
                  <label key={platform.key} className="platform-option">
                    <input
                      type="checkbox"
                      checked={formData.platforms.includes(platform.key)}
                      onChange={() => handlePlatformToggle(platform.key)}
                    />
                    <span className="platform-label">
                      <span className="platform-icon">{platform.icon}</span>
                      {platform.name}
                    </span>
                  </label>
                ))}
              </div>
              {errors.platforms && <span className="error-message">{errors.platforms}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.auto_publish}
                  onChange={(e) => setFormData(prev => ({ ...prev, auto_publish: e.target.checked }))}
                />
                <span className="checkbox-text">
                  <strong>Auto-publish immediately</strong>
                  <small>Uncheck to save as draft</small>
                </span>
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateModal;