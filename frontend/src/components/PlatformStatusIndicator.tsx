import React from 'react';
import './PlatformStatusIndicator.css';

interface PlatformStatus {
  status: 'pending' | 'success' | 'failed';
  platform_event_id?: string;
  error_message?: string;
  posted_at?: string;
}

interface PlatformStatusIndicatorProps {
  platformStatus: { [platform: string]: PlatformStatus };
  showLabels?: boolean;
  compact?: boolean;
}

const PlatformStatusIndicator: React.FC<PlatformStatusIndicatorProps> = ({
  platformStatus,
  showLabels = false,
  compact = false
}) => {
  const platforms = [
    { key: 'wordpress', name: 'WordPress', icon: '📝' },
    { key: 'facebook', name: 'Facebook', icon: '📘' },
    { key: 'instagram', name: 'Instagram', icon: '📷' },
    { key: 'eventbrite', name: 'Eventbrite', icon: '🎫' },
    { key: 'meetup', name: 'Meetup', icon: '👥' },
    { key: 'fetlife', name: 'FetLife', icon: '🔗' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'failed': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'pending': return '⏳';
      default: return '○';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (compact) {
    return (
      <div className="platform-status-compact">
        {platforms.map(platform => {
          const status = platformStatus[platform.key];
          return (
            <div
              key={platform.key}
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status?.status || 'none') }}
              title={`${platform.name}: ${status?.status || 'Not posted'}`}
            >
              {getStatusIcon(status?.status || 'none')}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="platform-status-indicator">
      {platforms.map(platform => {
        const status = platformStatus[platform.key];
        
        return (
          <div key={platform.key} className="platform-item">
            <div className="platform-header">
              <span className="platform-icon">{platform.icon}</span>
              {showLabels && <span className="platform-name">{platform.name}</span>}
              <div
                className="status-badge"
                style={{ backgroundColor: getStatusColor(status?.status || 'none') }}
              >
                {getStatusIcon(status?.status || 'none')}
              </div>
            </div>
            
            {status && (
              <div className="platform-details">
                <div className="status-text">
                  {status.status === 'success' && 'Posted successfully'}
                  {status.status === 'failed' && 'Failed to post'}
                  {status.status === 'pending' && 'Posting pending'}
                </div>
                
                {status.posted_at && (
                  <div className="posted-date">
                    {formatDate(status.posted_at)}
                  </div>
                )}
                
                {status.platform_event_id && (
                  <div className="platform-id">
                    ID: {status.platform_event_id}
                  </div>
                )}
                
                {status.error_message && (
                  <div className="error-message" title={status.error_message}>
                    Error: {status.error_message.substring(0, 50)}
                    {status.error_message.length > 50 && '...'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlatformStatusIndicator;