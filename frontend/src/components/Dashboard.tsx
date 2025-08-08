import React, { useState, useEffect } from 'react';
import StatsCards from './StatsCards';
import UpcomingEvents from './UpcomingEvents';
import QuickActions from './QuickActions';
import UnifiedEventView from './UnifiedEventView';
import { Event, EventListItem } from '../types/Event';
import './Dashboard.css';

export interface DashboardStats {
  eventsThisMonth: number;
  eventsThisMonthTrend: 'up' | 'down' | 'stable';
  platformStatus: {
    connected: number;
    total: number;
    failing: string[];
  };
  nextEventDays: number | null;
  recentActivity: string;
}

interface DashboardProps {
  onCreateEvent: (type: 'quick' | 'full') => void;
  onEventSelect: (eventId: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCreateEvent, onEventSelect }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventListItem[]>([]);
  const [allEvents, setAllEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadUpcomingEvents(),
        loadAllEvents()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // For now, create mock stats until we implement the API endpoint
      const mockStats: DashboardStats = {
        eventsThisMonth: 12,
        eventsThisMonthTrend: 'up',
        platformStatus: {
          connected: 4,
          total: 4,
          failing: []
        },
        nextEventDays: 3,
        recentActivity: '2 hours ago'
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      // Load events for next 7 days
      const response = await fetch('http://localhost:3001/api/events?limit=10&upcoming=7');
      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    }
  };

  const loadAllEvents = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/events?limit=50');
      if (response.ok) {
        const data = await response.json();
        setAllEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading all events:', error);
    }
  };

  const handleQuickAction = async (action: string, data?: any) => {
    switch (action) {
      case 'create_event':
        onCreateEvent('quick');
        break;
      case 'import_events':
        // Navigate to import functionality
        console.log('Import events clicked');
        break;
      case 'bulk_operations':
        // Show bulk operations panel
        console.log('Bulk operations clicked');
        break;
      default:
        console.log('Unknown quick action:', action);
    }
  };

  const handleEventAction = async (eventId: number, action: string) => {
    switch (action) {
      case 'edit':
        onEventSelect(eventId);
        break;
      case 'duplicate':
        // Implement duplicate functionality
        console.log('Duplicate event:', eventId);
        break;
      case 'distribute':
        // Implement redistribute functionality
        console.log('Redistribute event:', eventId);
        break;
      default:
        console.log('Unknown event action:', action, eventId);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's what's happening with your events.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="dashboard-section">
        <StatsCards stats={stats} />
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Upcoming Events</h2>
            <p className="section-subtitle">Next 7 days</p>
          </div>
          <UpcomingEvents 
            events={upcomingEvents}
            onEventAction={handleEventAction}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* All Events Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>All Events</h2>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
          </div>
        </div>
        
        <UnifiedEventView
          events={allEvents}
          viewMode={viewMode}
          onEventSelect={onEventSelect}
          selectedEvents={selectedEvents}
          onSelectionChange={setSelectedEvents}
        />
      </div>

      {/* Floating Action Button for Mobile */}
      <button 
        className="fab-create"
        onClick={() => onCreateEvent('quick')}
        title="Create Event"
      >
        +
      </button>
    </div>
  );
};

export default Dashboard;