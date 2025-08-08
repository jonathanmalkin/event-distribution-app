import React from 'react';
import './QuickActions.css';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: string;
  primary?: boolean;
}

interface QuickActionsProps {
  onAction: (action: string, data?: any) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions: QuickAction[] = [
    {
      id: 'create',
      title: 'Create Event',
      description: 'Start a new event with AI assistance',
      icon: '✨',
      color: '#007bff',
      action: 'create_event',
      primary: true
    },
    {
      id: 'import',
      title: 'Import Events',
      description: 'Bulk import from WordPress or other platforms',
      icon: '📥',
      color: '#28a745',
      action: 'import_events'
    },
    {
      id: 'bulk',
      title: 'Bulk Operations',
      description: 'Edit, publish, or manage multiple events',
      icon: '⚡',
      color: '#ffc107',
      action: 'bulk_operations'
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Track performance and engagement metrics',
      icon: '📊',
      color: '#6f42c1',
      action: 'view_analytics'
    }
  ];

  return (
    <div className="quick-actions">
      <div className="section-header">
        <h2>Quick Actions</h2>
        <p className="section-subtitle">Common tasks and shortcuts</p>
      </div>
      
      <div className="actions-grid">
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-card ${action.primary ? 'primary' : ''}`}
            onClick={() => onAction(action.action)}
            style={{ '--action-color': action.color } as React.CSSProperties}
          >
            <div className="action-icon">
              {action.icon}
            </div>
            <div className="action-content">
              <div className="action-title">{action.title}</div>
              <div className="action-description">{action.description}</div>
            </div>
            <div className="action-arrow">
              →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;