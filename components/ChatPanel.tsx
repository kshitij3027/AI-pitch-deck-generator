import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User } from 'lucide-react';
import { ChatMessage } from '../types';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white md:w-80 lg:w-96">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Sparkles size={16} />
        </div>
        <h2 className="font-semibold text-slate-800">AI Assistant</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <Sparkles size={32} className="mb-3 opacity-20" />
            <p className="text-sm">Ask me to create a slide about your market size, or build a whole deck for a fintech startup.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div 
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${
                msg.role === 'user' 
                  ? 'bg-white border-slate-200 text-slate-700' 
                  : 'bg-primary-600 border-primary-600 text-white'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div 
              className={`rounded-2xl p-3 text-sm shadow-sm max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-white text-slate-800 border border-slate-100'
                  : 'bg-primary-50 text-slate-800 border border-primary-100'
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isProcessing && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
               <Bot size={14} />
             </div>
             <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
               <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }}/>
               <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }}/>
               <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }}/>
             </div>
           </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 p-4 bg-white">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your slide..."
            disabled={isProcessing}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50 disabled:text-slate-300"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};