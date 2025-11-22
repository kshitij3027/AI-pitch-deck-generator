import React from 'react';
import { Slide } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SlidePreviewProps {
  slide: Slide;
  isLoading?: boolean;
  isActive?: boolean;
  onEdit?: (slide: Slide) => void;
}

// Mock data for charts since real data generation isn't implemented yet
const mockChartData = [
  { name: '2024', value: 400 },
  { name: '2025', value: 850 },
  { name: '2026', value: 1400 },
  { name: '2027', value: 2200 },
];

export const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, isLoading, isActive, onEdit }) => {
  
  if (isLoading) {
    return (
      <div className={`aspect-[16/9] w-full overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 flex flex-col ${isActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
         <div className="flex-1 p-8 md:p-12 flex flex-col animate-pulse">
            {/* Skeleton Title */}
            <div className="h-10 w-3/4 bg-slate-100 rounded-lg mb-8" />
            
            {/* Skeleton Content */}
            <div className="flex-1 space-y-4">
               <div className="h-4 w-full bg-slate-100 rounded" />
               <div className="h-4 w-5/6 bg-slate-100 rounded" />
               <div className="h-4 w-4/6 bg-slate-100 rounded" />
               
               <div className="mt-8 h-32 w-full bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-primary-400">
                     <Loader2 size={24} className="animate-spin" />
                     <span className="text-xs font-medium">AI is writing...</span>
                  </div>
               </div>
            </div>
         </div>
         <div className="h-12 border-t border-slate-100 bg-slate-50" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 flex flex-col hover:shadow-lg transition-shadow group"
    >
      {/* Edit Trigger Overlay */}
      {onEdit && (
        <div className="absolute right-4 top-4 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(slide);
            }}
            className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-primary-600"
          >
            <Edit3 size={12} />
            Edit Slide
          </button>
        </div>
      )}

      <div className="flex-1 p-8 md:p-12 flex flex-col cursor-default">
        <div 
          className="mb-6 hover:ring-2 hover:ring-primary-100 hover:ring-offset-4 rounded-lg transition-all cursor-pointer"
          onClick={() => onEdit && onEdit(slide)}
          title="Click to edit title"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{slide.title}</h2>
        </div>
        
        <div 
          className="flex-1 relative hover:ring-2 hover:ring-primary-100 hover:ring-offset-4 rounded-lg transition-all cursor-pointer p-2 -m-2"
          onClick={() => onEdit && onEdit(slide)}
          title="Click to edit content"
        >
          {slide.type === 'bullets' && (
            <div className="space-y-3 text-lg text-slate-700">
              {slide.content.split('\n').map((line, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-3"
                >
                  <span className="text-primary-500 mt-1.5">•</span>
                  <span>{line.replace(/^- /, '')}</span>
                </motion.div>
              ))}
            </div>
          )}

          {slide.type === 'title' && (
            <div className="flex h-full items-center justify-center text-center flex-col gap-6">
              <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">{slide.content}</p>
              <div className="h-1 w-24 bg-primary-500 rounded-full" />
            </div>
          )}

          {slide.type === 'chart' && (
            <div className="h-full w-full flex flex-col">
               <p className="mb-6 text-slate-600 text-lg">{slide.content}</p>
               <div className="flex-1 w-full min-h-0 pointer-events-none">
                 {/* pointer-events-none used here so the click goes through to the edit handler */}
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                     <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={60} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}

          {(slide.type === 'image_left' || slide.type === 'image_right') && (
             <div className={`flex h-full gap-8 ${slide.type === 'image_right' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className="w-1/2 h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner relative group">
                  <img 
                    src={`https://picsum.photos/800/600?random=${slide.id}`} 
                    alt="Slide visual" 
                    className="h-full w-full object-cover opacity-90 mix-blend-multiply" 
                  />
                  <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    AI generated image
                  </div>
               </div>
               <div className="w-1/2 flex items-center">
                 <p className="text-lg text-slate-700 whitespace-pre-line leading-relaxed">{slide.content}</p>
               </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Footer/Branding */}
      <div className="h-12 border-t border-slate-100 px-8 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-500 rounded-sm" />
          <span className="font-medium text-slate-500">PitchDeck AI</span>
        </div>
        <span>CONFIDENTIAL</span>
      </div>
    </motion.div>
  );
};
