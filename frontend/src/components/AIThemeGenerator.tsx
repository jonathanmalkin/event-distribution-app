import React, { useState, useEffect } from 'react';
import './AIThemeGenerator.css';

interface Venue {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Event {
  date_time: string;
  venue_id: number;
  venue?: Venue;
  description?: string;
  manual_theme_override?: string;
}

interface Theme {
  name: string;
  description: string;
}

interface AIThemeGeneratorProps {
  event: Event;
  onThemeGenerated: (theme: string, description: string, imageUrl?: string) => void;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const AIThemeGenerator: React.FC<AIThemeGeneratorProps> = ({ event, onThemeGenerated, onBack }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [enlargedImage, setEnlargedImage] = useState(false);

  useEffect(() => {
    // Only generate themes if we don't have any yet
    if (themes.length === 0) {
      generateThemes();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateThemes = async (userFeedback?: string) => {
    setLoading(true);
    setThemes([]);
    setSelectedTheme(null);
    setImageUrl('');
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_time: event.date_time,
          venue_id: event.venue_id,
          manual_override: event.manual_theme_override,
          feedback: userFeedback
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate themes');
      }

      const data = await response.json();
      setThemes(data.themes);

    } catch (error) {
      console.error('Error generating themes:', error);
      alert('Failed to generate themes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      generateThemes(feedback);
      setFeedback('');
    }
  };

  const selectTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    // Don't automatically generate image anymore
    setImageUrl(''); // Clear any existing image
  };

  const generateImage = async () => {
    if (!selectedTheme) return;
    
    setImageLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: selectedTheme.name,
          description: selectedTheme.description,
          date_time: event.date_time
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setImageUrl(data.image_url);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. You can continue without it.');
    } finally {
      setImageLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatLoading(true);
    setChatInput('');

    try {
      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          context: {
            event,
            selectedTheme,
            availableThemes: themes
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send chat message');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.response };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedTheme) {
      onThemeGenerated(selectedTheme.name, selectedTheme.description, imageUrl);
    }
  };

  return (
    <div className="ai-theme-generator-compact">
      <div className="compact-layout">
        {/* Left Column: Themes */}
        <div className="themes-column-compact">
          <div className="section-header-compact">
            <h4>Select Theme</h4>
            <button 
              onClick={() => generateThemes()} 
              disabled={loading}
              className="btn-regenerate"
            >
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
          
          {loading ? (
            <div className="loading-compact">⏳ Generating themes...</div>
          ) : themes.length > 0 ? (
            <div className="theme-grid">
              {themes.map((theme, index) => (
                <div 
                  key={index}
                  className={`theme-card ${selectedTheme?.name === theme.name ? 'selected' : ''}`}
                  onClick={() => selectTheme(theme)}
                  title={theme.description}
                >
                  <div className="theme-title">{theme.name}</div>
                  <div className="theme-preview">{theme.description.substring(0, 40)}...</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-themes-compact">Click 🔄 to generate themes</div>
          )}

          {themes.length > 0 && (
            <div className="feedback-section-compact">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Want different themes? Describe what you want..."
                rows={2}
                className="feedback-input-compact"
              />
              <button 
                onClick={handleFeedbackSubmit}
                disabled={!feedback.trim() || loading}
                className="btn-feedback"
              >
                ✨ Refine
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Selected Theme & Image */}
        <div className="content-column">
          {selectedTheme ? (
            <>
              <div className="selected-display">
                <h4 className="selected-title">{selectedTheme.name}</h4>
                <p className="selected-description">{selectedTheme.description}</p>
              </div>

              <div className="image-section-compact">
                {imageLoading ? (
                  <div className="image-loading">🎨 Creating image...</div>
                ) : imageUrl ? (
                  <div className="image-container">
                    <img 
                      src={imageUrl} 
                      alt="Generated banner" 
                      onClick={() => setEnlargedImage(true)}
                      className="generated-image"
                      title="Click to enlarge"
                    />
                  </div>
                ) : (
                  <div className="image-placeholder">
                    <p>📸 Ready to generate banner image</p>
                    <button 
                      onClick={generateImage}
                      className="btn-generate-image"
                      disabled={!selectedTheme}
                    >
                      Generate Image
                    </button>
                  </div>
                )}
              </div>

              <div className="quick-chat">
                <div className="chat-messages-mini">
                  {chatMessages.slice(-2).map((message, index) => (
                    <div key={index} className={`chat-bubble ${message.role}`}>
                      <span>{message.content}</span>
                    </div>
                  ))}
                </div>
                
                <div className="chat-input-mini">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Quick feedback..."
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    disabled={chatLoading}
                  />
                  <button 
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="btn-chat"
                  >
                    💬
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="selection-prompt">
                <h3>🎨 AI Theme Generator</h3>
                <p>Select a theme from the left to see the full description and generate a banner image.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Enlargement Modal */}
      {enlargedImage && imageUrl && (
        <div className="image-modal" onClick={() => setEnlargedImage(false)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt="Generated banner - enlarged" />
            <button 
              className="close-modal"
              onClick={() => setEnlargedImage(false)}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="action-bar">
        <button onClick={onBack} className="btn-back">
          ← Back
        </button>
        <div className="spacer"></div>
        <button 
          onClick={handleContinue}
          disabled={!selectedTheme}
          className="btn-continue"
        >
          Continue → Preview
        </button>
      </div>
    </div>
  );
};

export default AIThemeGenerator;