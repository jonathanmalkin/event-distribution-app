import React, { useState, useEffect } from 'react';
import './WordPressImport.css';

interface ImportOptions {
  dateRange?: {
    from: string;
    to: string;
  };
  includeImages: boolean;
  conflictStrategy: 'local' | 'wordpress' | 'latest' | 'manual';
  dryRun: boolean;
  statusFilter: string[];
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: any[];
  venuesCreated: number;
  imagesDownloaded: number;
}

interface ImportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  options: ImportOptions;
  result?: ImportResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface Conflict {
  id: number;
  eventId: number;
  wordpressId: number;
  conflictType: 'content' | 'venue' | 'image' | 'status' | 'datetime';
  localValue: any;
  wordpressValue: any;
  createdAt: string;
  localEvent: {
    theme: string;
    date_time: string;
    status: string;
  };
}

const WordPressImport: React.FC = () => {
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    includeImages: true,
    conflictStrategy: 'manual',
    dryRun: false,
    statusFilter: ['publish', 'draft']
  });

  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'history' | 'conflicts'>('import');
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    loadImportHistory();
    loadConflicts();
  }, []);

  const loadImportHistory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/import/wordpress/history');
      if (response.ok) {
        const data = await response.json();
        setImportHistory(data.imports);
      }
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  const loadConflicts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/import/wordpress/conflicts');
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  };

  const startImport = async () => {
    setIsImporting(true);
    setLastResult(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/import/wordpress/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importOptions),
      });

      if (response.ok) {
        const data = await response.json();
        setLastResult(data.result);
        await loadImportHistory();
        await loadConflicts();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error starting import:', error);
      alert('Import failed: Network error');
    } finally {
      setIsImporting(false);
    }
  };

  const resolveConflict = async (conflictId: number, resolution: 'local' | 'wordpress') => {
    try {
      const response = await fetch(`http://localhost:3001/api/import/wordpress/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution }),
      });

      if (response.ok) {
        await loadConflicts();
        alert('Conflict resolved successfully');
      } else {
        const error = await response.json();
        alert(`Failed to resolve conflict: ${error.message}`);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'processing': return '#ffc107';
      case 'queued': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const renderImportForm = () => (
    <div className="import-form">
      <h3>WordPress Import Configuration</h3>
      
      <div className="form-section">
        <h4>Date Range</h4>
        <div className="date-range">
          <label>
            From:
            <input
              type="date"
              value={importOptions.dateRange?.from || ''}
              onChange={(e) => setImportOptions({
                ...importOptions,
                dateRange: {
                  ...importOptions.dateRange,
                  from: e.target.value,
                  to: importOptions.dateRange?.to || ''
                }
              })}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={importOptions.dateRange?.to || ''}
              onChange={(e) => setImportOptions({
                ...importOptions,
                dateRange: {
                  ...importOptions.dateRange,
                  from: importOptions.dateRange?.from || '',
                  to: e.target.value
                }
              })}
            />
          </label>
        </div>
        <small>Leave empty to import last 6 months to next 12 months</small>
      </div>

      <div className="form-section">
        <h4>Import Options</h4>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={importOptions.includeImages}
            onChange={(e) => setImportOptions({
              ...importOptions,
              includeImages: e.target.checked
            })}
          />
          Download and import banner images
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={importOptions.dryRun}
            onChange={(e) => setImportOptions({
              ...importOptions,
              dryRun: e.target.checked
            })}
          />
          Dry run (preview only, don't save changes)
        </label>
      </div>

      <div className="form-section">
        <h4>Conflict Resolution Strategy</h4>
        <select
          value={importOptions.conflictStrategy}
          onChange={(e) => setImportOptions({
            ...importOptions,
            conflictStrategy: e.target.value as ImportOptions['conflictStrategy']
          })}
        >
          <option value="manual">Manual - Review each conflict</option>
          <option value="local">Local wins - Keep local changes</option>
          <option value="wordpress">WordPress wins - Use WordPress data</option>
          <option value="latest">Latest wins - Use most recently modified</option>
        </select>
      </div>

      <div className="form-section">
        <h4>Event Status Filter</h4>
        <div className="status-filters">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importOptions.statusFilter.includes('publish')}
              onChange={(e) => {
                const newFilter = e.target.checked
                  ? [...importOptions.statusFilter, 'publish']
                  : importOptions.statusFilter.filter(s => s !== 'publish');
                setImportOptions({ ...importOptions, statusFilter: newFilter });
              }}
            />
            Published events
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importOptions.statusFilter.includes('draft')}
              onChange={(e) => {
                const newFilter = e.target.checked
                  ? [...importOptions.statusFilter, 'draft']
                  : importOptions.statusFilter.filter(s => s !== 'draft');
                setImportOptions({ ...importOptions, statusFilter: newFilter });
              }}
            />
            Draft events
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importOptions.statusFilter.includes('private')}
              onChange={(e) => {
                const newFilter = e.target.checked
                  ? [...importOptions.statusFilter, 'private']
                  : importOptions.statusFilter.filter(s => s !== 'private');
                setImportOptions({ ...importOptions, statusFilter: newFilter });
              }}
            />
            Private events
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button
          onClick={startImport}
          disabled={isImporting || importOptions.statusFilter.length === 0}
          className="btn-primary"
        >
          {isImporting ? 'Importing...' : 'Start Import'}
        </button>
      </div>

      {lastResult && (
        <div className="import-result">
          <h4>Last Import Result</h4>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-number">{lastResult.imported}</span>
              <span className="stat-label">Imported</span>
            </div>
            <div className="stat">
              <span className="stat-number">{lastResult.updated}</span>
              <span className="stat-label">Updated</span>
            </div>
            <div className="stat">
              <span className="stat-number">{lastResult.conflicts}</span>
              <span className="stat-label">Conflicts</span>
            </div>
            <div className="stat">
              <span className="stat-number">{lastResult.venuesCreated}</span>
              <span className="stat-label">Venues Created</span>
            </div>
          </div>
          {lastResult.errors.length > 0 && (
            <div className="import-errors">
              <h5>Errors ({lastResult.errors.length})</h5>
              {lastResult.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="error-item">
                  <strong>Event {error.wordpressId}:</strong> {error.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="import-history">
      <h3>Import History</h3>
      {importHistory.length === 0 ? (
        <p>No imports yet</p>
      ) : (
        <div className="history-list">
          {importHistory.map((job) => (
            <div key={job.id} className="history-item">
              <div className="history-header">
                <div className="history-status">
                  <span 
                    className="status-indicator" 
                    style={{ backgroundColor: getStatusColor(job.status) }}
                  ></span>
                  <span className="status-text">{job.status}</span>
                </div>
                <div className="history-date">
                  {formatDate(job.createdAt)}
                </div>
              </div>
              
              {job.result && (
                <div className="history-stats">
                  <span>Imported: {job.result.imported}</span>
                  <span>Updated: {job.result.updated}</span>
                  <span>Conflicts: {job.result.conflicts}</span>
                  <span>Errors: {job.result.errors.length}</span>
                </div>
              )}
              
              {job.error && (
                <div className="history-error">
                  Error: {job.error}
                </div>
              )}
              
              <div className="history-options">
                <small>
                  Images: {job.options.includeImages ? 'Yes' : 'No'} | 
                  Strategy: {job.options.conflictStrategy} | 
                  Dry Run: {job.options.dryRun ? 'Yes' : 'No'}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderConflicts = () => (
    <div className="conflicts-section">
      <h3>Unresolved Conflicts ({conflicts.length})</h3>
      {conflicts.length === 0 ? (
        <p>No unresolved conflicts</p>
      ) : (
        <div className="conflicts-list">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="conflict-item">
              <div className="conflict-header">
                <h4>{conflict.localEvent.theme}</h4>
                <span className="conflict-type">{conflict.conflictType}</span>
              </div>
              
              <div className="conflict-comparison">
                <div className="conflict-side">
                  <h5>Local Value</h5>
                  <div className="conflict-value">
                    {typeof conflict.localValue === 'object' 
                      ? JSON.stringify(conflict.localValue) 
                      : String(conflict.localValue)}
                  </div>
                </div>
                
                <div className="conflict-side">
                  <h5>WordPress Value</h5>
                  <div className="conflict-value">
                    {typeof conflict.wordpressValue === 'object' 
                      ? JSON.stringify(conflict.wordpressValue) 
                      : String(conflict.wordpressValue)}
                  </div>
                </div>
              </div>
              
              <div className="conflict-actions">
                <button
                  onClick={() => resolveConflict(conflict.id, 'local')}
                  className="btn-secondary"
                >
                  Keep Local
                </button>
                <button
                  onClick={() => resolveConflict(conflict.id, 'wordpress')}
                  className="btn-primary"
                >
                  Use WordPress
                </button>
              </div>
              
              <div className="conflict-meta">
                <small>Created: {formatDate(conflict.createdAt)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="wordpress-import">
      <div className="import-header">
        <h2>WordPress Import</h2>
        <p>Import events from your WordPress site using The Events Calendar plugin</p>
      </div>

      <div className="import-tabs">
        <button
          onClick={() => setActiveTab('import')}
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
        >
          Import
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          History ({importHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`tab-button ${activeTab === 'conflicts' ? 'active' : ''}`}
        >
          Conflicts ({conflicts.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'import' && renderImportForm()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'conflicts' && renderConflicts()}
      </div>
    </div>
  );
};

export default WordPressImport;