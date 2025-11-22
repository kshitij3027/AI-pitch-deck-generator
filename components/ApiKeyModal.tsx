
import React, { useState } from 'react';
import { Lock, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { setApiKey } from '../services/openaiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim().startsWith('sk-')) {
        setError('Invalid key format. OpenAI keys typically start with sk-');
        return;
    }
    setApiKey(key.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter OpenAI API Key"
      description="To generate pitch decks with AI, please enter your OpenAI API key."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-center gap-2 mb-2 font-semibold">
             <Lock size={14} />
             Secure Client-Side Storage
          </div>
          <p>Your API key is encrypted and stored locally in your browser session. It is deleted automatically when you close this tab. It is never sent to our servers.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">API Key</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Key size={16} />
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
              }}
              placeholder="sk-..."
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="text-xs text-slate-500">
          Don't have a key? <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-0.5">Get one from OpenAI <ExternalLink size={10} /></a>
        </div>

        <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={!key}>
                Save & Continue
            </Button>
        </div>
      </form>
    </Modal>
  );
};
