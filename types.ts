export interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'bullets' | 'image_left' | 'image_right' | 'chart';
  notes?: string;
}

export interface Deck {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  thumbnail?: string; // Base64 string or URL placeholder
  slides: Slide[];
}

export type ViewState = 'dashboard' | 'editor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}