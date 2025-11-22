import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Slide } from '../types';

interface EditSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide | null;
  onSave: (updatedSlide: Slide) => void;
}

export const EditSlideModal: React.FC<EditSlideModalProps> = ({
  isOpen,
  onClose,
  slide,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Slide['type']>('bullets');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (slide) {
      setTitle(slide.title);
      setContent(slide.content);
      setType(slide.type);
      setNotes(slide.notes || '');
    }
  }, [slide]);

  const handleSave = () => {
    if (!slide) return;
    
    onSave({
      ...slide,
      title,
      content,
      type,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Slide"
      description="Modify the content and layout of this slide."
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Slide Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Layout Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Slide['type'])}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="title">Title Slide</option>
            <option value="bullets">Bullet Points</option>
            <option value="image_left">Image Left</option>
            <option value="image_right">Image Right</option>
            <option value="chart">Chart</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder={type === 'bullets' ? "- Point 1\n- Point 2" : "Enter slide content..."}
          />
          <p className="mt-1 text-xs text-slate-500">
            {type === 'bullets' 
              ? 'Use markdown dashes (-) for bullet points.' 
              : 'Enter the main paragraph text or description.'}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Speaker Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="Notes for the presenter..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
};
