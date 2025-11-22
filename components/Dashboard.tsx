import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Deck } from '../types';
import { getAllDecks, deleteDeck } from '../services/storage';
import { DeckCard } from './DeckCard';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { motion } from 'framer-motion';

interface DashboardProps {
  onCreateNew: () => void;
  onOpenDeck: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onCreateNew, onOpenDeck }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const data = await getAllDecks();
      setDecks(data);
    } catch (error) {
      console.error("Failed to load decks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteDeck(deleteId);
      setDecks(prev => prev.filter(d => d.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete deck", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-slate-500">Manage your pitch decks and presentations.</p>
          </div>
          <Button onClick={onCreateNew} size="lg" className="shadow-lg shadow-primary-500/20">
            <Plus size={20} className="mr-2" />
            New Deck
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : decks.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
              <Plus size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No decks created yet</h3>
            <p className="mb-6 max-w-sm text-sm text-slate-500">
              Get started by creating your first AI-powered pitch deck to impress your investors.
            </p>
            <Button onClick={onCreateNew}>Create your first deck</Button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {decks.map((deck) => (
              <DeckCard 
                key={deck.id} 
                deck={deck} 
                onOpen={onOpenDeck}
                onDelete={setDeleteId}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Deck?"
        description="This action cannot be undone. This will permanently delete the deck and all of its slides."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </>
        }
      />
    </div>
  );
};