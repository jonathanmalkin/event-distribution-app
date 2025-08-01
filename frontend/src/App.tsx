import React, { useState } from 'react';
import EventCreator from './components/EventCreator';
import EventManagement from './components/EventManagement';
import './App.css';

type ActivePage = 'create' | 'manage';

function App() {
  const [activePage, setActivePage] = useState<ActivePage>('create');

  return (
    <div className="App">
      <nav className="App-navigation">
        <div className="nav-brand">
          <h1>Event Distribution App</h1>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${activePage === 'create' ? 'active' : ''}`}
            onClick={() => setActivePage('create')}
          >
            Create Event
          </button>
          <button 
            className={`nav-link ${activePage === 'manage' ? 'active' : ''}`}
            onClick={() => setActivePage('manage')}
          >
            Manage Events
          </button>
        </div>
      </nav>
      
      <main className="App-main">
        {activePage === 'create' ? (
          <EventCreator />
        ) : (
          <EventManagement />
        )}
      </main>
    </div>
  );
}

export default App;
