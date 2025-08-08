import React, { useState, useEffect } from 'react';
import EventCreator from './components/EventCreator';
import EventManagement from './components/EventManagement';
import WordPressImport from './components/WordPressImport';
import './App.css';

type ActivePage = 'create' | 'manage' | 'import';

function App() {
  // Get initial page from URL or default to 'manage'
  const getInitialPage = (): ActivePage => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    return (page === 'create' || page === 'manage' || page === 'import') ? page : 'manage';
  };

  const [activePage, setActivePage] = useState<ActivePage>(getInitialPage);

  // Update URL when page changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', activePage);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activePage]);

  return (
    <div className="App">
      <nav className="App-navigation">
        <div className="nav-brand">
          <h1>Event Distribution App</h1>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${activePage === 'manage' ? 'active' : ''}`}
            onClick={() => setActivePage('manage')}
          >
            Manage Events
          </button>
          <button 
            className={`nav-link ${activePage === 'create' ? 'active' : ''}`}
            onClick={() => setActivePage('create')}
          >
            Create Event
          </button>
          <button 
            className={`nav-link ${activePage === 'import' ? 'active' : ''}`}
            onClick={() => setActivePage('import')}
          >
            WordPress Import
          </button>
        </div>
      </nav>
      
      <main className="App-main">
        {activePage === 'create' ? (
          <EventCreator />
        ) : activePage === 'import' ? (
          <WordPressImport />
        ) : (
          <EventManagement />
        )}
      </main>
    </div>
  );
}

export default App;
