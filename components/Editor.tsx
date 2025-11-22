import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Share2, Download, Loader2, Sparkles, Save } from 'lucide-react';
import { Deck, Slide, ChatMessage } from '../types';
import { getDeckById, saveDeck, createInitialDeck, generateId } from '../services/storage';
import { 
  generateDeckOutline, 
  generateSlideContent, 
  generateSingleSlideOutline,
  determineEditorAction 
} from '../services/openaiService';
import { ChatPanel } from './ChatPanel';
import { SlidePreview } from './SlidePreview';
import { Button } from './ui/Button';
import { EditSlideModal } from './EditSlideModal';
import { Modal } from './ui/Modal';

interface EditorProps {
  deckId: string | null;
  onBack: () => void;
}

export const Editor: React.FC<EditorProps> = ({ deckId, onBack }) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatingSlideId, setGeneratingSlideId] = useState<string | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  
  // Save & Persistence State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load deck or create new
  useEffect(() => {
    const initDeck = async () => {
      if (deckId) {
        const existing = await getDeckById(deckId);
        if (existing) {
          setDeck(existing);
          setHasUnsavedChanges(false); // Loaded from DB
          if (existing.slides.length === 0) {
             addSystemMessage("Welcome back! What would you like to add to your deck today?");
          }
        } else {
          // Edge case: ID provided but not found, create new
          const newDeck = createInitialDeck();
          setDeck(newDeck);
          setHasUnsavedChanges(false); // New draft
          addSystemMessage("Hi! Describe your startup idea, and I'll build a pitch deck for you.");
        }
      } else {
        const newDeck = createInitialDeck();
        setDeck(newDeck);
        setHasUnsavedChanges(false); // New draft
        addSystemMessage("Hi! Describe your startup idea, and I'll build a pitch deck for you.");
      }
    };
    initDeck();
  }, [deckId]);

  // Browser warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'model',
      text,
      timestamp: Date.now()
    }]);
  };

  // Update local state and mark as unsaved
  const updateDeckState = (updatedDeck: Deck) => {
    setDeck(updatedDeck);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!deck) return;
    setIsSaving(true);
    try {
      // Update timestamp on save
      const deckToSave = { ...deck, lastModified: Date.now() };
      await saveDeck(deckToSave);
      setDeck(deckToSave);
      setHasUnsavedChanges(false);
      
      // Per US-015: Redirect to dashboard after save
      onBack(); 
    } catch (error) {
      console.error("Failed to save deck:", error);
      addSystemMessage("I couldn't save your deck due to an error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    onBack();
  };

  const handleManualSlideUpdate = (updatedSlide: Slide) => {
    if (!deck) return;
    const newSlides = deck.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
    const updatedDeck = { ...deck, slides: newSlides };
    updateDeckState(updatedDeck);
  };

  const handleSendMessage = async (text: string) => {
    // Add user message
    const newUserMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsProcessing(true);

    try {
      if (!deck) return;

      // Determine Intent
      const action = await determineEditorAction(text, deck.slides);
      console.log("Action determined:", action);

      switch (action.type) {
        case 'CHAT':
          addSystemMessage(action.response || "I'm not sure how to help with that.");
          break;

        case 'CREATE_DECK':
          await handleCreateDeck(action.topic || text);
          break;

        case 'ADD_SLIDE':
          await handleAddSlide(action.topic || "New Slide", action.position);
          break;

        case 'REMOVE_SLIDE':
          await handleRemoveSlide(action.indices || []);
          break;

        case 'REORDER_SLIDE':
          await handleReorderSlide(action.from, action.to);
          break;

        case 'UPDATE_SLIDE':
          await handleUpdateSlide(action.index, action.instructions);
          break;
      }

    } catch (error) {
      console.error(error);
      addSystemMessage("I encountered an error while processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Action Handlers ---

  const handleCreateDeck = async (topic: string) => {
    if (!deck) return;
    addSystemMessage("Analyzing your request and structuring the deck...");
    const outline = await generateDeckOutline(topic);
    
    const newSlides: Slide[] = outline.map(item => ({
      id: generateId(),
      title: item.title,
      type: item.type,
      content: "",
      notes: ""
    }));

    // Replace existing slides (conceptually a new deck)
    const updatedDeck = { ...deck, slides: newSlides };
    updateDeckState(updatedDeck);

    addSystemMessage(`I've created an outline with ${outline.length} slides. Now drafting content...`);
    await generateContentForSlides(updatedDeck, outline);
  };

  const handleAddSlide = async (topic: string, position?: number) => {
    if (!deck) return;
    addSystemMessage(`Adding a slide about "${topic}"...`);
    
    const outlineSlide = await generateSingleSlideOutline(topic);
    const newSlide: Slide = {
      id: generateId(),
      title: outlineSlide.title,
      type: outlineSlide.type,
      content: "", // Pending
      notes: ""
    };

    const currentSlides = [...deck.slides];
    const insertIndex = (position && position > 0 && position <= currentSlides.length + 1) 
      ? position - 1 
      : currentSlides.length;
    
    currentSlides.splice(insertIndex, 0, newSlide);
    
    const updatedDeck = { ...deck, slides: currentSlides };
    updateDeckState(updatedDeck);

    // Scroll to new slide
    setTimeout(() => {
      document.getElementById(`slide-${newSlide.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    // Generate content
    setGeneratingSlideId(newSlide.id);
    const content = await generateSlideContent(topic, outlineSlide);
    const completedSlide = { ...newSlide, ...content };
    
    const finalSlides = updatedDeck.slides.map(s => s.id === newSlide.id ? completedSlide : s);
    updateDeckState({ ...deck, slides: finalSlides });
    setGeneratingSlideId(null);
    addSystemMessage("Slide added successfully.");
  };

  const handleRemoveSlide = async (indices: number[]) => {
    if (!deck) return;
    if (indices.length === 0) {
      addSystemMessage("I couldn't figure out which slide to remove.");
      return;
    }

    const slidesToRemove = new Set(indices.map(i => i - 1)); // Convert to 0-based
    const newSlides = deck.slides.filter((_, index) => !slidesToRemove.has(index));
    
    updateDeckState({ ...deck, slides: newSlides });
    addSystemMessage(`Removed ${indices.length} slide(s).`);
  };

  const handleReorderSlide = async (from?: number, to?: number) => {
    if (!deck || from === undefined || to === undefined) return;
    if (from < 1 || from > deck.slides.length || to < 1 || to > deck.slides.length) {
      addSystemMessage("The slide numbers seem to be out of range.");
      return;
    }

    const newSlides = [...deck.slides];
    const [movedSlide] = newSlides.splice(from - 1, 1);
    newSlides.splice(to - 1, 0, movedSlide);

    updateDeckState({ ...deck, slides: newSlides });
    addSystemMessage(`Moved slide ${from} to position ${to}.`);
    
    setTimeout(() => {
      document.getElementById(`slide-${movedSlide.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleUpdateSlide = async (index?: number, instructions?: string) => {
    if (!deck || !index || !instructions) return;
    const slideIndex = index - 1;
    if (slideIndex < 0 || slideIndex >= deck.slides.length) {
      addSystemMessage("I couldn't find that slide.");
      return;
    }

    const slideToUpdate = deck.slides[slideIndex];
    addSystemMessage(`Updating slide ${index}...`);
    setGeneratingSlideId(slideToUpdate.id);

    const newContent = await generateSlideContent("Update Request", {
      title: slideToUpdate.title,
      type: slideToUpdate.type, 
      instructions: instructions + ". If the user asked for a different layout (like chart or bullets), format the content accordingly."
    });
    
    let newType = slideToUpdate.type;
    const lowerInst = instructions.toLowerCase();
    if (lowerInst.includes("chart") || lowerInst.includes("graph")) newType = 'chart';
    else if (lowerInst.includes("bullet") || lowerInst.includes("list")) newType = 'bullets';
    else if (lowerInst.includes("image")) newType = 'image_right';

    const updatedSlide = {
      ...slideToUpdate,
      content: newContent.content,
      notes: newContent.notes,
      type: newType
    };

    const newSlides = deck.slides.map((s, i) => i === slideIndex ? updatedSlide : s);
    updateDeckState({ ...deck, slides: newSlides });
    setGeneratingSlideId(null);
    addSystemMessage(`Slide ${index} updated.`);
  };

  const generateContentForSlides = async (currentDeck: Deck, outline: any[]) => {
    const slides = [...currentDeck.slides];
    
    for (let i = 0; i < slides.length; i++) {
      // Only generate if empty
      if (slides[i].content) continue;

      const slideId = slides[i].id;
      setGeneratingSlideId(slideId);
      
      const element = document.getElementById(`slide-${slideId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const contentResult = await generateSlideContent(currentDeck.title || "Startup", outline[i]);
      
      slides[i] = { ...slides[i], ...contentResult };
      
      // Update UI without triggering save yet? 
      // No, generation counts as changes.
      updateDeckState({ ...currentDeck, slides: [...slides] });
    }
    setGeneratingSlideId(null);
    addSystemMessage("Deck generation complete! Don't forget to save your work.");
  };

  // --- Render ---

  if (!deck) return <div className="h-screen w-full bg-slate-50" />;

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackNavigation}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
             <div className="flex items-center gap-2">
               <h1 className="text-sm font-semibold text-slate-900">{deck.title}</h1>
               {hasUnsavedChanges && (
                 <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />
               )}
             </div>
             <p className="text-xs text-slate-500">
               {hasUnsavedChanges ? 'Unsaved changes' : `Last saved ${new Date(deck.lastModified).toLocaleTimeString()}`}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button size="sm" variant="ghost">
            <Share2 size={16} className="mr-2" />
            Share
          </Button>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <Button 
            size="sm" 
            variant="primary" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Save
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <ChatPanel 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          isProcessing={isProcessing} 
        />

        {/* Right Panel: Preview */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-100/50 p-8 relative scroll-smooth">
           <div className="mx-auto max-w-4xl space-y-8 pb-20">
             {deck.slides.length === 0 && !isProcessing ? (
               <div className="flex h-[60vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center">
                 <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
                   <Sparkles size={32} className="text-primary-400" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">Your deck is empty</h3>
                 <p className="max-w-sm text-slate-500 mt-2">Use the chat on the left to describe your startup, and I'll generate the slides for you.</p>
               </div>
             ) : (
               deck.slides.map((slide, index) => (
                 <div key={slide.id} id={`slide-${slide.id}`} className="relative group">
                   <div className="absolute -left-12 top-0 text-sm font-medium text-slate-300">
                     {index + 1}
                   </div>
                   <SlidePreview 
                      slide={slide} 
                      isLoading={slide.content === "" && isProcessing}
                      isActive={generatingSlideId === slide.id}
                      onEdit={setEditingSlide}
                   />
                 </div>
               ))
             )}
             {isProcessing && !generatingSlideId && deck.slides.length > 0 && (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                   <Loader2 className="animate-spin" size={20} />
                   <span>Planning next steps...</span>
                </div>
             )}
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditSlideModal 
        isOpen={!!editingSlide}
        onClose={() => setEditingSlide(null)}
        slide={editingSlide}
        onSave={handleManualSlideUpdate}
      />

      {/* Unsaved Changes Warning Modal */}
      <Modal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="Unsaved Changes"
        description="You have unsaved changes in your deck. If you leave now, your progress will be lost."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowUnsavedModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDiscardChanges}>Discard Changes</Button>
            <Button variant="primary" onClick={() => {
                handleSave(); // This will save and then trigger onBack via the save success flow
                setShowUnsavedModal(false);
            }}>
              Save & Exit
            </Button>
          </>
        }
      />
    </div>
  );
};