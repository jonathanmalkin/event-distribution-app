import React from 'react';
import PlatformStatusIndicator from './PlatformStatusIndicator';
import { EventListItem, Venue, Filters, PlatformStatusSummary } from '../types/Event';
import './EventList.css';

interface EventListProps {
  events: EventListItem[];
  venues: Venue[];
  loading: boolean;
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
  onEventSelect: (eventId: number) => void;
  selectedEvents: number[];
  onSelectedEventsChange: (eventIds: number[]) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const EventList: React.FC<EventListProps> = ({
  events,
  venues,
  loading,
  filters,
  onFiltersChange,
  onClearFilters,
  onEventSelect,
  selectedEvents,
  onSelectedEventsChange,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectedEventsChange(events.map(event => event.id));
    } else {
      onSelectedEventsChange([]);
    }
  };

  const handleSelectEvent = (eventId: number, checked: boolean) => {
    if (checked) {
      onSelectedEventsChange([...selectedEvents, eventId]);
    } else {
      onSelectedEventsChange(selectedEvents.filter(id => id !== eventId));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };


  const getPlatformSuccessCount = (platformStatus: PlatformStatusSummary) => {
    const statuses = Object.values(platformStatus);
    const successful = statuses.filter(s => s.status === 'success').length;
    return `${successful}/${statuses.length}`;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          className="page-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ‹ Previous
        </button>
        {startPage > 1 && (
          <>
            <button className="page-btn" onClick={() => onPageChange(1)}>1</button>
            {startPage > 2 && <span className="page-ellipsis">...</span>}
          </>
        )}
        {pages}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="page-ellipsis">...</span>}
            <button className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          className="page-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next ›
        </button>
      </div>
    );
  };

  return (
    <div className="event-list">
      <div className="list-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search events..."
            />
          </div>
          
          <div className="filter-group">
            <label>Date Range:</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFiltersChange({ startDate: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFiltersChange({ endDate: e.target.value })}
            />
          </div>
          
          <div className="filter-group">
            <label>Venue:</label>
            <select
              value={filters.venue || ''}
              onChange={(e) => onFiltersChange({ venue: e.target.value })}
            >
              <option value="">All Venues</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status || ''}
              onChange={(e) => onFiltersChange({ status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <select
              value={filters.sort || 'date_time'}
              onChange={(e) => onFiltersChange({ sort: e.target.value })}
            >
              <option value="date_time">Event Date</option>
              <option value="created_at">Created Date</option>
              <option value="theme">Theme</option>
              <option value="status">Status</option>
            </select>
          </div>
          
          <button className="clear-filters-btn" onClick={onClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="list-loading">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : (
        <>
          <div className="list-table">
            <div className="table-header">
              <div className="header-cell select-cell">
                <input
                  type="checkbox"
                  checked={selectedEvents.length === events.length && events.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              <div className="header-cell date-cell">Date & Time</div>
              <div className="header-cell theme-cell">Theme</div>
              <div className="header-cell venue-cell">Venue</div>
              <div className="header-cell platforms-cell">Platforms</div>
              <div className="header-cell rsvp-cell">RSVPs</div>
              <div className="header-cell actions-cell">Actions</div>
            </div>

            <div className="table-body">
              {events.map(event => (
                <div key={event.id} className="table-row">
                  <div className="cell select-cell">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => handleSelectEvent(event.id, e.target.checked)}
                    />
                  </div>
                  
                  <div className="cell date-cell">
                    <div className="event-date">
                      {formatDate(event.date_time)}
                    </div>
                  </div>
                  
                  <div className="cell theme-cell">
                    <div className="event-theme">
                      {event.manual_theme_override || event.theme || 'Untitled Event'}
                    </div>
                    {event.description && (
                      <div className="event-description">
                        {event.description.substring(0, 100)}
                        {event.description.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <div className="cell venue-cell">
                    <div className="venue-name">
                      {event.venue?.name || 'TBD'}
                    </div>
                    {event.venue && (
                      <div className="venue-location">
                        {event.venue.city}, {event.venue.state}
                      </div>
                    )}
                  </div>
                  
                  
                  <div className="cell platforms-cell">
                    <div className="platform-summary">
                      <PlatformStatusIndicator 
                        platformStatus={event.platform_status} 
                        compact={true} 
                      />
                      <span className="success-count">
                        {getPlatformSuccessCount(event.platform_status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="cell rsvp-cell">
                    <span className="rsvp-count">
                      {event.rsvp_count || 0}
                    </span>
                  </div>
                  
                  <div className="cell actions-cell">
                    <button
                      className="action-btn view-btn"
                      onClick={() => onEventSelect(event.id)}
                      title="View Details"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="no-events">
                  <p>No events found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>

          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default EventList;