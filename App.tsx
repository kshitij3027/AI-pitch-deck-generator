
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ViewState } from './types';
import { hasApiKey } from './services/openaiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    // Check for API key when user enters the app
    if (!hasApiKey()) {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleCreateNew = () => {
    setActiveDeckId(null); // null indicates new deck
    setView('editor');
    // Re-check key when trying to create new work
    if (!hasApiKey()) {
      setShowApiKeyModal(true);
    }
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
