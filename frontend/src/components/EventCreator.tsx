import React, { useState, useEffect } from 'react';
import EventForm from './EventForm';
import AIThemeGenerator from './AIThemeGenerator';
import EventPreview from './EventPreview';
import ConfigurationScreen from './ConfigurationScreen';
import DraftIndicator from './DraftIndicator';
import { useAutoSave } from '../hooks/useAutoSave';
import './EventCreator.css';

interface Venue {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Event {
  id?: number;
  date_time: string;
  venue_id: number;
  venue?: Venue;
  description?: string;
  manual_theme_override?: string;
  theme?: string;
  ai_generated_description?: string;
  banner_image_url?: string;
}

const EventCreator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'form' | 'ai' | 'preview'>('form');
  const [showConfig, setShowConfig] = useState(false);
  const [event, setEvent] = useState<Event>({
    date_time: '',
    venue_id: 0, // Will be set when user selects venue
    manual_theme_override: ''
  });
  const [loading, setLoading] = useState(false);
  const [workflowId] = useState(() => `full_create_${Date.now()}`);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  const { saveDraft, loadDraft, clearDraft, hasExistingDraft } = useAutoSave({
    data: { event, currentStep },
    key: workflowId,
    interval: 30000, // Save every 30 seconds
    enabled: true,
    onSave: () => setLastSaved(new Date())
  });

  // Check for existing drafts on mount
  useEffect(() => {
    if (hasExistingDraft()) {
      setShowDraftDialog(true);
    }
  }, [hasExistingDraft]);

  // Save draft whenever event or step changes
  useEffect(() => {
    if (event.date_time || event.venue_id || event.manual_theme_override) {
      saveDraft({ event, currentStep }, getStepNumber(currentStep));
    }
  }, [event, currentStep, saveDraft]);

  const getStepNumber = (step: string): number => {
    switch (step) {
      case 'form': return 1;
      case 'ai': return 2;
      case 'preview': return 3;
      default: return 1;
    }
  };

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setEvent(draft.event);
      setCurrentStep(draft.currentStep);
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

  const handleFormSubmit = (formData: Event) => {
    setEvent(formData);
    setCurrentStep('ai');
  };

  const handleThemeGenerated = (theme: string, description: string, imageUrl?: string) => {
    setEvent(prev => ({
      ...prev,
      theme,
      description,
      banner_image_url: imageUrl
    }));
    setCurrentStep('preview');
  };

  const handlePublish = async (selectedPlatforms: string[]) => {
    setLoading(true);
    try {
      // Step 1: Create the event
      const response = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          status: 'published'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const createdEvent = await response.json();
      console.log('Event created:', createdEvent);
      
      // Step 2: Trigger distribution to selected platforms
      const distributionResponse = await fetch(`http://localhost:3001/api/distribution/publish/${createdEvent.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          platforms: selectedPlatforms 
        }),
      });

      if (distributionResponse.ok) {
        const distributionResult = await distributionResponse.json();
        console.log('Distribution initiated:', distributionResult);
        alert(`Event created and publishing to ${distributionResult.platforms.join(', ')}!`);
      } else {
        // Event was created but distribution failed
        console.error('Distribution failed:', await distributionResponse.text());
        alert('Event created successfully, but distribution failed. You can manually distribute it from Event Management.');
      }
      
      // Clear draft and reset form
      clearDraft();
      setEvent({
        date_time: '',
        venue_id: 0,
        manual_theme_override: ''
      });
      setCurrentStep('form');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('ai');
    } else if (currentStep === 'ai') {
      setCurrentStep('form');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'form':
        return (
          <EventForm 
            initialData={event}
            onSubmit={handleFormSubmit}
          />
        );
      case 'ai':
        return (
          <AIThemeGenerator
            event={event}
            onThemeGenerated={handleThemeGenerated}
            onBack={handleBack}
          />
        );
      case 'preview':
        return (
          <EventPreview
            event={event}
            onPublish={handlePublish}
            onBack={handleBack}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };


  if (showConfig) {
    return (
      <div className="event-creator">
        <div className="workflow-header">
          <div className="workflow-title">
            <h1>Event Distribution App</h1>
            <p>Settings & Configuration</p>
          </div>
          
          <div className="settings-nav">
            <span>Settings</span>
          </div>
          
          <button 
            onClick={() => setShowConfig(false)}
            className="config-button back-button"
            title="Back to Event Creation"
          >
            ←
          </button>
        </div>
        
        <div className="step-content">
          <ConfigurationScreen onClose={() => setShowConfig(false)} />
        </div>
      </div>
    );
  }

  // Draft Recovery Dialog
  const renderDraftDialog = () => {
    if (!showDraftDialog) return null;

    return (
      <div className="draft-dialog-overlay">
        <div className="draft-dialog">
          <h3>📝 Draft Found</h3>
          <p>You have an unsaved draft from a previous session. Would you like to continue where you left off?</p>
          <div className="draft-dialog-buttons">
            <button 
              onClick={handleLoadDraft}
              className="btn btn-primary"
            >
              Continue Draft
            </button>
            <button 
              onClick={handleDiscardDraft}
              className="btn btn-secondary"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="event-creator">
      {renderDraftDialog()}
      <div className="workflow-header">
        <div className="workflow-title">
          <h1>Event Distribution App</h1>
          <p>Create and distribute Kinky Coffee events automatically</p>
        </div>
        
        <div className="workflow-steps">
          <div className={`step ${currentStep === 'form' ? 'active' : currentStep === 'ai' || currentStep === 'preview' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Event Details</div>
          </div>
          <div className={`step ${currentStep === 'ai' ? 'active' : currentStep === 'preview' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Theme & Image</div>
          </div>
          <div className={`step ${currentStep === 'preview' ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Preview & Publish</div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowConfig(true)}
          className="config-button"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
      
      <div className="step-content">
        {renderCurrentStep()}
      </div>
      
      <DraftIndicator 
        isEnabled={!showConfig && (event.date_time !== '' || event.venue_id !== 0 || event.manual_theme_override !== '')}
        lastSaved={lastSaved}
        autoSaveInterval={30000}
      />
    </div>
  );
};

export default EventCreator;