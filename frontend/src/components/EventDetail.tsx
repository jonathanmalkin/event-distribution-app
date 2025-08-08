import React, { useState } from 'react';
import PlatformStatusIndicator from './PlatformStatusIndicator';
import { EventDetail as EventDetailType } from '../types/Event';
import './EventDetail.css';

interface EventDetailProps {
  event: EventDetailType;
  onClose: () => void;
  onUpdate: (eventId: number, updates: Partial<EventDetailType>) => void;
  onRepost: (eventId: number, platforms: string[]) => void;
  onDelete: (eventId: number) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({
  event,
  onClose,
  onUpdate,
  onRepost,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<EventDetailType>(event);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const platforms = [
    { key: 'wordpress', name: 'WordPress' },
    { key: 'facebook', name: 'Facebook' },
    { key: 'instagram', name: 'Instagram' },
    { key: 'eventbrite', name: 'Eventbrite' },
    { key: 'meetup', name: 'Meetup' },
    { key: 'fetlife', name: 'FetLife' }
  ];

  const handleSave = () => {
    onUpdate(event.id, {
      theme: editedEvent.theme,
      description: editedEvent.description,
      manual_theme_override: editedEvent.manual_theme_override,
      status: editedEvent.status
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedEvent(event);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(event.id);
    onClose(); // Close the modal after deletion
  };

  const handleRepost = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/distribution/publish/${event.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Distribution initiated for ${selectedPlatforms.join(', ')}`);
        // Refresh event data to show updated status
        window.location.reload(); // Simple refresh for now
      } else {
        const error = await response.json();
        alert(`Distribution failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error distributing event:', error);
      alert('Failed to distribute event');
    }
    
    setShowRepostModal(false);
    setSelectedPlatforms([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published': return 'status-published';
      case 'scheduled': return 'status-scheduled';
      case 'draft': return 'status-draft';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-draft';
    }
  };

  const getPlatformStatusSummary = () => {
    const allStatuses = Object.values(event.platform_status).flat();
    const successful = allStatuses.filter(s => s && s.status === 'success').length;
    const failed = allStatuses.filter(s => s && s.status === 'failed').length;
    const pending = allStatuses.filter(s => s && s.status === 'pending').length;
    
    return { successful, failed, pending, total: allStatuses.length };
  };

  const statusSummary = getPlatformStatusSummary();

  return (
    <div className="event-detail-overlay" onClick={onClose}>
      <div className="event-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <h2>{event.manual_theme_override || event.theme || 'Untitled Event'}</h2>
            <span className={`status-badge ${getStatusBadgeClass(event.status)}`}>
              {event.status}
            </span>
          </div>
          <div className="header-actions">
            {!isEditing && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                ✏️ Edit
              </button>
            )}
            <button className="repost-btn" onClick={() => setShowRepostModal(true)}>
              🔄 Distribute
            </button>
            <button className="status-btn" onClick={() => window.open(`http://localhost:3001/api/distribution/status/${event.id}`, '_blank')}>
              📊 Status
            </button>
            <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>
              🗑️ Delete
            </button>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="modal-content">
          {/* Basic Event Information */}
          <div className="info-section">
            <h3>Event Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Date & Time:</label>
                <span>{formatDate(event.date_time)}</span>
              </div>
              
              <div className="info-item">
                <label>Venue:</label>
                <span>
                  {event.venue ? (
                    <>
                      <div>{event.venue.name}</div>
                      <div className="venue-address">
                        {event.venue.street_address}<br />
                        {event.venue.city}, {event.venue.state} {event.venue.zip_code}
                      </div>
                    </>
                  ) : 'TBD'}
                </span>
              </div>
              
              <div className="info-item">
                <label>RSVPs:</label>
                <span>{event.rsvp_count}</span>
              </div>
              
              <div className="info-item">
                <label>Created:</label>
                <span>{formatDate(event.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Editable Content */}
          <div className="content-section">
            <h3>Content</h3>
            
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Theme Override:</label>
                  <input
                    type="text"
                    value={editedEvent.manual_theme_override || ''}
                    onChange={(e) => setEditedEvent({
                      ...editedEvent,
                      manual_theme_override: e.target.value
                    })}
                    placeholder="Override theme name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={editedEvent.description || ''}
                    onChange={(e) => setEditedEvent({
                      ...editedEvent,
                      description: e.target.value
                    })}
                    rows={4}
                    placeholder="Event description"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    value={editedEvent.status}
                    onChange={(e) => setEditedEvent({
                      ...editedEvent,
                      status: e.target.value as EventDetailType['status']
                    })}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSave}>
                    Save Changes
                  </button>
                  <button className="cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="content-display">
                <div className="content-item">
                  <label>Theme:</label>
                  <span>{event.theme || 'Not set'}</span>
                </div>
                
                {event.manual_theme_override && (
                  <div className="content-item">
                    <label>Theme Override:</label>
                    <span>{event.manual_theme_override}</span>
                  </div>
                )}
                
                <div className="content-item">
                  <label>Description:</label>
                  <span>{event.description || 'No description provided'}</span>
                </div>
                
                {event.banner_image_url && (
                  <div className="content-item">
                    <label>Banner Image:</label>
                    <img 
                      src={event.banner_image_url} 
                      alt="Event banner" 
                      className="banner-preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Platform Status */}
          <div className="platform-section">
            <h3>Platform Distribution Status</h3>
            <div className="status-summary">
              <div className="summary-item success">
                <span className="count">{statusSummary.successful}</span>
                <span className="label">Successful</span>
              </div>
              <div className="summary-item failed">
                <span className="count">{statusSummary.failed}</span>
                <span className="label">Failed</span>
              </div>
              <div className="summary-item pending">
                <span className="count">{statusSummary.pending}</span>
                <span className="label">Pending</span>
              </div>
            </div>
            
            <div className="platform-details">
              {platforms.map(platform => {
                const history = event.platform_status[platform.key] || [];
                
                return (
                  <div key={platform.key} className="platform-history">
                    <h4>{platform.name}</h4>
                    {history.length === 0 ? (
                      <div className="no-history">Not posted</div>
                    ) : (
                      <div className="history-timeline">
                        {history.map((attempt: any, index: number) => (
                          <div key={index} className="timeline-item">
                            <div className="timeline-status">
                              <span className={`status-dot ${attempt.status}`}></span>
                              <span className="status-text">{attempt.status}</span>
                            </div>
                            <div className="timeline-details">
                              <div className="timeline-date">
                                {formatDate(attempt.created_at)}
                              </div>
                              {attempt.posted_at && (
                                <div className="posted-date">
                                  Posted: {formatDate(attempt.posted_at)}
                                </div>
                              )}
                              {attempt.platform_event_id && (
                                <div className="platform-id">
                                  ID: {attempt.platform_event_id}
                                </div>
                              )}
                              {attempt.platform_url && (
                                <div className="platform-link">
                                  <a href={attempt.platform_url} target="_blank" rel="noopener noreferrer">
                                    View on {platform.name} →
                                  </a>
                                </div>
                              )}
                              {attempt.error_message && (
                                <div className="error-details">
                                  Error: {attempt.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Repost Modal */}
        {showRepostModal && (
          <div className="repost-modal">
            <div className="repost-content">
              <h3>Repost Event</h3>
              <p>Select platforms to repost this event:</p>
              
              <div className="platform-checkboxes">
                {platforms.map(platform => (
                  <label key={platform.key} className="platform-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform.key]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.key));
                        }
                      }}
                    />
                    {platform.name}
                  </label>
                ))}
              </div>
              
              <div className="repost-actions">
                <button className="repost-confirm-btn" onClick={handleRepost}>
                  Repost Selected
                </button>
                <button 
                  className="repost-cancel-btn" 
                  onClick={() => {
                    setShowRepostModal(false);
                    setSelectedPlatforms([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-modal">
            <div className="delete-content">
              <h3>⚠️ Delete Event</h3>
              <p>Are you sure you want to delete this event?</p>
              <p><strong>{event.manual_theme_override || event.theme || 'Untitled Event'}</strong></p>
              <div className="delete-warning">
                <p>This action cannot be undone. The event will be permanently deleted from:</p>
                <ul>
                  <li>The local database</li>
                  <li>All distribution records</li>
                  <li>RSVP data</li>
                </ul>
                <p><em>Note: This will NOT delete the event from external platforms (Facebook, Eventbrite, etc.) that have already been posted to.</em></p>
              </div>
              
              <div className="delete-actions">
                <button className="delete-confirm-btn" onClick={handleDelete}>
                  Yes, Delete Event
                </button>
                <button 
                  className="delete-cancel-btn" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;