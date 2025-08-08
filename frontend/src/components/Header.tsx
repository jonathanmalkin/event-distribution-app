import React, { useState, useRef, useEffect } from 'react';
import './Header.css';

type ViewType = 'dashboard' | 'settings';
type CreateType = 'quick' | 'full';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onCreateEvent: (type: CreateType) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onCreateEvent }) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateClick = (type: CreateType) => {
    setShowCreateMenu(false);
    onCreateEvent(type);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-brand">
          <h1>Event Distribution App</h1>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => onViewChange('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>

      <div className="header-right">
        {/* Create Event Dropdown */}
        <div className="create-dropdown" ref={createMenuRef}>
          <button 
            className="btn-create-main"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
          >
            + Create Event
            <svg 
              className={`dropdown-arrow ${showCreateMenu ? 'rotated' : ''}`}
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
          
          {showCreateMenu && (
            <div className="create-menu">
              <button 
                className="create-option quick"
                onClick={() => handleCreateClick('quick')}
              >
                <div className="option-content">
                  <div className="option-icon">⚡</div>
                  <div className="option-details">
                    <div className="option-title">Quick Create</div>
                    <div className="option-description">Fast event creation (30 seconds)</div>
                  </div>
                </div>
              </button>
              
              <button 
                className="create-option full"
                onClick={() => handleCreateClick('full')}
              >
                <div className="option-content">
                  <div className="option-icon">🎨</div>
                  <div className="option-details">
                    <div className="option-title">Full Workflow</div>
                    <div className="option-description">AI-assisted theme & image generation</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="user-dropdown" ref={userMenuRef}>
          <button 
            className="btn-user"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">👤</div>
            <svg 
              className={`dropdown-arrow ${showUserMenu ? 'rotated' : ''}`}
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="user-menu">
              <button className="user-option">
                <span className="option-icon">📊</span>
                View Analytics
              </button>
              <button className="user-option">
                <span className="option-icon">📋</span>
                Export Data
              </button>
              <div className="menu-divider"></div>
              <button className="user-option">
                <span className="option-icon">❓</span>
                Help & Support
              </button>
              <button className="user-option">
                <span className="option-icon">🔒</span>
                Privacy Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;