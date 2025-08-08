import React, { useState, useEffect } from 'react';
import './ConfigurationScreen.css';

interface AIPrompts {
  themeGeneration: {
    model?: string;
    systemPrompt: string;
    userPromptTemplate: string;
    regeneratePromptTemplate: string;
  };
  imageGeneration: {
    model?: string;
    promptTemplate: string;
    fallbackPrompt: string;
  };
  chatSystem: {
    model?: string;
    systemPrompt: string;
  };
  availableModels?: {
    textModels: Array<{
      id: string;
      name: string;
      description: string;
    }>;
    imageModels: Array<{
      id: string;
      name: string;
      description: string;
    }>;
  };
}

interface PlatformConfig {
  wordpress: {
    url: string;
    username: string;
    password: string;
  };
  facebook: {
    appId: string;
    appSecret: string;
    accessToken: string;
  };
  instagram: {
    appId: string;
    appSecret: string;
    accessToken: string;
  };
  eventbrite: {
    apiKey: string;
    organizationId: string;
  };
  meetup: {
    apiKey: string;
    groupId: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
  };
}

interface ConfigurationScreenProps {
  onClose: () => void;
}

const ConfigurationScreen: React.FC<ConfigurationScreenProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'platforms' | 'general'>('ai');
  const [aiPrompts, setAiPrompts] = useState<AIPrompts | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Load AI prompts
      const aiResponse = await fetch('http://localhost:3001/api/config/ai-prompts');
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setAiPrompts(aiData);
      }

      // Load platform config
      const platformResponse = await fetch('http://localhost:3001/api/config/platforms');
      if (platformResponse.ok) {
        const platformData = await platformResponse.json();
        setPlatformConfig(platformData);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAIPrompts = async () => {
    if (!aiPrompts) return;
    
    setSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/config/ai-prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiPrompts),
      });

      if (!response.ok) {
        throw new Error('Failed to save AI prompts');
      }

      alert('AI prompts saved successfully!');
    } catch (error) {
      console.error('Error saving AI prompts:', error);
      alert('Failed to save AI prompts. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateAIPrompt = (section: keyof AIPrompts, field: string, value: string) => {
    if (!aiPrompts) return;
    
    setAiPrompts(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="configuration-page">
        <div className="loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="configuration-page">

      <div className="config-tabs">
        <button 
          className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Prompts
        </button>
        <button 
          className={`tab-button ${activeTab === 'platforms' ? 'active' : ''}`}
          onClick={() => setActiveTab('platforms')}
        >
          Distribution Platforms
        </button>
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </button>
      </div>

      <div className="config-content">
        {/* AI Prompts Tab */}
        {activeTab === 'ai' && aiPrompts && (
          <div className="config-section">
            <h3>AI Prompts Configuration</h3>
            <p className="section-description">
              Customize the prompts used for AI theme generation, image creation, and chat interactions.
            </p>

            <div className="prompt-group">
              <h4>Theme Generation</h4>
              
              <div className="form-group">
                <label>AI Model</label>
                <select
                  value={aiPrompts.themeGeneration.model || 'gpt-4o'}
                  onChange={(e) => updateAIPrompt('themeGeneration', 'model', e.target.value)}
                >
                  {aiPrompts.availableModels?.textModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  value={aiPrompts.themeGeneration.systemPrompt}
                  onChange={(e) => updateAIPrompt('themeGeneration', 'systemPrompt', e.target.value)}
                  rows={3}
                  placeholder="System prompt for theme generation..."
                />
              </div>

              <div className="form-group">
                <label>User Prompt Template</label>
                <textarea
                  value={aiPrompts.themeGeneration.userPromptTemplate}
                  onChange={(e) => updateAIPrompt('themeGeneration', 'userPromptTemplate', e.target.value)}
                  rows={8}
                  placeholder="Template for theme generation requests. Use {date} and {location} placeholders..."
                />
                <small>Use {`{date}`} and {`{location}`} as placeholders</small>
              </div>

              <div className="form-group">
                <label>Regenerate Prompt Template</label>
                <textarea
                  value={aiPrompts.themeGeneration.regeneratePromptTemplate}
                  onChange={(e) => updateAIPrompt('themeGeneration', 'regeneratePromptTemplate', e.target.value)}
                  rows={4}
                  placeholder="Template for regenerating themes with feedback..."
                />
                <small>Use {`{feedback}`}, {`{date}`}, and {`{location}`} as placeholders</small>
              </div>
            </div>

            <div className="prompt-group">
              <h4>Image Generation</h4>
              
              <div className="form-group">
                <label>AI Model</label>
                <select
                  value={aiPrompts.imageGeneration.model || 'dall-e-3'}
                  onChange={(e) => updateAIPrompt('imageGeneration', 'model', e.target.value)}
                >
                  {aiPrompts.availableModels?.imageModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Image Prompt Template</label>
                <textarea
                  value={aiPrompts.imageGeneration.promptTemplate}
                  onChange={(e) => updateAIPrompt('imageGeneration', 'promptTemplate', e.target.value)}
                  rows={6}
                  placeholder="Template for image generation..."
                />
                <small>Use {`{theme}`} and {`{description}`} as placeholders</small>
              </div>

              <div className="form-group">
                <label>Fallback Prompt</label>
                <textarea
                  value={aiPrompts.imageGeneration.fallbackPrompt}
                  onChange={(e) => updateAIPrompt('imageGeneration', 'fallbackPrompt', e.target.value)}
                  rows={4}
                  placeholder="Fallback prompt when theme-specific generation fails..."
                />
              </div>
            </div>

            <div className="prompt-group">
              <h4>Chat System</h4>
              
              <div className="form-group">
                <label>AI Model</label>
                <select
                  value={aiPrompts.chatSystem.model || 'gpt-4o'}
                  onChange={(e) => updateAIPrompt('chatSystem', 'model', e.target.value)}
                >
                  {aiPrompts.availableModels?.textModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  value={aiPrompts.chatSystem.systemPrompt}
                  onChange={(e) => updateAIPrompt('chatSystem', 'systemPrompt', e.target.value)}
                  rows={6}
                  placeholder="System prompt for AI chat interactions..."
                />
              </div>
            </div>

            <div className="config-actions">
              <button onClick={saveAIPrompts} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save AI Prompts'}
              </button>
            </div>
          </div>
        )}

        {/* Platform Configuration Tab */}
        {activeTab === 'platforms' && (
          <div className="config-section">
            <h3>Distribution Platform Configuration</h3>
            <div className="config-notice">
              <p><strong>Note:</strong> Platform credentials are managed through environment variables for security.</p>
              <p>Current platform configuration status:</p>
            </div>
            
            {platformConfig ? (
              <div className="platform-status">
                {Object.entries(platformConfig).map(([platform, config]) => (
                  <div key={platform} className="platform-status-item">
                    <h4>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h4>
                    <div className="status-grid">
                      {Object.entries(config as any).map(([key, value]) => (
                        <div key={key} className="status-field">
                          <span className="field-name">{key}:</span>
                          <span className={`field-status ${value ? 'configured' : 'missing'}`}>
                            {value ? '✅ Configured' : '❌ Not Set'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Loading platform configuration...</p>
            )}
            
            <p className="section-description">
              To update platform credentials, modify the environment variables in your .env file and restart the server.
            </p>
          </div>
        )}

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="config-section">
            <h3>General Settings</h3>
            <p className="section-description">
              Application-wide settings and preferences.
            </p>

            <div className="setting-group">
              <h4>Event Defaults</h4>
              
              <div className="form-group">
                <label>Default Event Day</label>
                <select defaultValue="0">
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div className="form-group">
                <label>Default Event Time</label>
                <input type="time" defaultValue="11:00" />
              </div>
            </div>

            <div className="setting-group">
              <h4>Privacy Settings</h4>
              
              <div className="form-group">
                <label>
                  <input type="checkbox" defaultChecked />
                  Hide venue address until RSVP
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input type="checkbox" defaultChecked />
                  Require email for RSVP
                </label>
              </div>
            </div>

            <div className="config-actions">
              <button disabled className="btn-primary">
                Save General Settings (Coming Soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationScreen;