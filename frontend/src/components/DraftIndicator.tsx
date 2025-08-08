import React, { useState, useEffect } from 'react';
import './DraftIndicator.css';

interface DraftIndicatorProps {
  isEnabled: boolean;
  lastSaved?: Date | null;
  autoSaveInterval?: number;
}

const DraftIndicator: React.FC<DraftIndicatorProps> = ({ 
  isEnabled, 
  lastSaved, 
  autoSaveInterval = 30000 
}) => {
  const [timeUntilSave, setTimeUntilSave] = useState(autoSaveInterval / 1000);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      setTimeUntilSave(prev => {
        if (prev <= 1) {
          setStatus('saving');
          setTimeout(() => setStatus('saved'), 1000);
          setTimeout(() => setStatus('idle'), 3000);
          return autoSaveInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, autoSaveInterval]);

  // Reset timer when lastSaved changes
  useEffect(() => {
    if (lastSaved) {
      setTimeUntilSave(autoSaveInterval / 1000);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [lastSaved, autoSaveInterval]);

  if (!isEnabled) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'saving': return '⏳';
      case 'saved': return '✅';
      default: return '💾';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving': return 'Saving draft...';
      case 'saved': return 'Draft saved';
      default: return `Auto-save in ${timeUntilSave}s`;
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return lastSaved.toLocaleDateString();
  };

  return (
    <div className={`draft-indicator ${status}`}>
      <div className="draft-status">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      {lastSaved && status === 'idle' && (
        <div className="last-saved">
          Last saved: {formatLastSaved()}
        </div>
      )}
    </div>
  );
};

export default DraftIndicator;