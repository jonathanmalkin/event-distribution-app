import React from 'react';
import { CalendarEvent } from '../types/Event';
import './EventCalendar.css';

interface EventCalendarProps {
  events: { [date: string]: CalendarEvent[] };
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onEventSelect: (eventId: number) => void;
  loading: boolean;
}

const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  currentMonth,
  onMonthChange,
  onEventSelect,
  loading
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    onMonthChange(newMonth);
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const dayEvents = events[dateKey] || [];
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className="event-item"
                style={{ backgroundColor: getStatusColor(event.status) }}
                onClick={() => onEventSelect(event.id)}
                title={`${event.theme || 'Untitled Event'} at ${event.venue_name || 'TBD'}`}
              >
                <span className="event-time">
                  {new Date(event.date_time || event.time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
                <span className="event-title">
                  {event.theme || 'Untitled Event'}
                </span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="event-calendar">
      <div className="calendar-header">
        <div className="calendar-navigation">
          <button className="nav-btn" onClick={() => navigateMonth('prev')}>
            ‹
          </button>
          <h2 className="month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button className="nav-btn" onClick={() => navigateMonth('next')}>
            ›
          </button>
        </div>
        
        <div className="calendar-actions">
          <button className="today-btn" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
          <span>Published</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
          <span>Scheduled</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#6c757d' }}></div>
          <span>Draft</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
          <span>Cancelled</span>
        </div>
      </div>

      {loading ? (
        <div className="calendar-loading">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : (
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {dayNames.map(day => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
          
          <div className="calendar-days">
            {renderCalendarGrid()}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;