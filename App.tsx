import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { ViewState } from './types';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useInactivity } from './hooks/useInactivity';
import { hasApiKey, clearApiKey } from './services/openaiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Check for API key on mount
  useEffect(() => {
    if (!hasApiKey()) {
      setShowApiKeyModal(true);
    }
  }, []);

  // Setup inactivity timer (15 minutes)
  useInactivity(() => {
    clearApiKey();
    setShowApiKeyModal(true);
  }, 15 * 60 * 1000);

  const handleCreateNew = () => {
    setActiveDeckId(null); // null indicates new deck
    setView('editor');
  };

  const handleOpenDeck = (id: string) => {
    setActiveDeckId(id);
    setView('editor');
  };

  const handleBackToDashboard = () => {
    setActiveDeckId(null);
    setView('dashboard');
  };

  return (
    <div className="font-sans text-slate-900 antialiased">
      {view === 'dashboard' ? (
        <Dashboard 
          onCreateNew={handleCreateNew} 
          onOpenDeck={handleOpenDeck} 
        />
      ) : (
        <Editor 
          deckId={activeDeckId} 
          onBack={handleBackToDashboard} 
        />
      )}

      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
      />
    </div>
  );
};

export default App;