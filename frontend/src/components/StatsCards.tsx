import React from 'react';
import { DashboardStats } from './Dashboard';
import './StatsCards.css';

interface StatsCard {
  id: string;
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  status: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  subtitle?: string;
  onClick?: () => void;
}

interface StatsCardsProps {
  stats: DashboardStats | null;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="stats-cards">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stats-card loading">
            <div className="card-skeleton"></div>
          </div>
        ))}
      </div>
    );
  }

  const getStatusFromPlatforms = () => {
    if (stats.platformStatus.failing.length > 0) return 'error';
    if (stats.platformStatus.connected < stats.platformStatus.total) return 'warning';
    return 'success';
  };

  const getNextEventStatus = () => {
    if (stats.nextEventDays === null) return 'warning';
    if (stats.nextEventDays <= 1) return 'error';
    if (stats.nextEventDays <= 3) return 'warning';
    return 'info';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '';
    }
  };

  const formatNextEventValue = () => {
    if (stats.nextEventDays === null) return 'None scheduled';
    if (stats.nextEventDays === 0) return 'Today!';
    if (stats.nextEventDays === 1) return 'Tomorrow';
    return `${stats.nextEventDays} days`;
  };

  const cards: StatsCard[] = [
    {
      id: 'events-month',
      title: 'This Month',
      value: stats.eventsThisMonth,
      trend: stats.eventsThisMonthTrend,
      status: 'info',
      icon: '📅',
      subtitle: `${getTrendIcon(stats.eventsThisMonthTrend)} vs last month`
    },
    {
      id: 'platform-status',
      title: 'Platform Status',
      value: `${stats.platformStatus.connected}/${stats.platformStatus.total}`,
      status: getStatusFromPlatforms(),
      icon: '🔗',
      subtitle: stats.platformStatus.failing.length > 0 
        ? `${stats.platformStatus.failing.join(', ')} offline`
        : 'All platforms connected'
    },
    {
      id: 'next-event',
      title: 'Next Event',
      value: formatNextEventValue(),
      status: getNextEventStatus(),
      icon: '⏰',
      subtitle: stats.nextEventDays !== null ? 'Upcoming' : 'Schedule one now'
    },
    {
      id: 'recent-activity',
      title: 'Last Published',
      value: stats.recentActivity,
      status: 'success',
      icon: '✅',
      subtitle: 'Recent activity'
    }
  ];

  return (
    <div className="stats-cards">
      {cards.map(card => (
        <div 
          key={card.id}
          className={`stats-card ${card.status} ${card.onClick ? 'clickable' : ''}`}
          onClick={card.onClick}
        >
          <div className="card-header">
            <div className="card-icon">{card.icon}</div>
            <div className="card-title">{card.title}</div>
          </div>
          
          <div className="card-content">
            <div className="card-value">{card.value}</div>
            {card.subtitle && (
              <div className="card-subtitle">{card.subtitle}</div>
            )}
          </div>

          {card.trend && (
            <div className="card-trend">
              <span className={`trend-indicator ${card.trend}`}>
                {getTrendIcon(card.trend)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsCards;