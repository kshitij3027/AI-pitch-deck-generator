import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Trash2, Calendar, Presentation } from 'lucide-react';
import { Deck } from '../types';
import { Button } from './ui/Button';

interface DeckCardProps {
  deck: Deck;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, onOpen, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onOpen(deck.id)}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        {deck.thumbnail ? (
          <img 
            src={deck.thumbnail} 
            alt={deck.title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Presentation size={48} strokeWidth={1.5} />
          </div>
        )}
        
        {/* Hover Overlay with Delete Action */}
        <div 
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
           <Button 
             variant="destructive"
             size="sm"
             className="shadow-lg"
             onClick={(e) => {
               e.stopPropagation(); // Prevent opening the deck
               onDelete(deck.id);
             }}
           >
             <Trash2 size={16} className="mr-2" />
             Delete Deck
           </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1" title={deck.title}>
          {deck.title}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
             <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
             {deck.slides.length} slides
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            {new Date(deck.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};