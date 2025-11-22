
export interface OutlineSlide {
  title: string;
  type: 'title' | 'bullets' | 'image_left' | 'image_right' | 'chart';
  instructions: string;
}

const API_URL = "https://api.openai.com/v1/chat/completions";

// In-memory cache for the key
let _apiKey: string | null = null;

// Basic obfuscation to avoid storing plain text in storage
const encrypt = (text: string) => btoa(text.split('').reverse().join('')); 
const decrypt = (encoded: string) => atob(encoded).split('').reverse().join('');

export const hasApiKey = (): boolean => {
  if (_apiKey) return true;
  return !!sessionStorage.getItem('pitchdeck_ai_key');
};

export const setApiKey = (key: string) => {
  _apiKey = key;
  sessionStorage.setItem('pitchdeck_ai_key', encrypt(key));
};

export const getApiKey = (): string | null => {
  if (_apiKey) return _apiKey;
  const stored = sessionStorage.getItem('pitchdeck_ai_key');
  if (stored) {
    try {
      _apiKey = decrypt(stored);
      return _apiKey;
    } catch (e) {
      return null;
    }
  }
  return null;
};

async function fetchOpenAI(messages: any[]) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("OpenAI API Key is missing. Please provide a valid API key.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o", 
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API Error: ${response.status} ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error("Failed to parse AI response");
  }
}

export const generateDeckOutline = async (topic: string): Promise<OutlineSlide[]> => {
  const systemPrompt = `You are a startup pitch deck expert. Create a compelling pitch deck outline for a startup about the given topic.
  Return a JSON object with a "slides" property containing an array of 6-10 slides.
  
  For each slide object in the array, specify:
  - title: string (The headline of the slide)
  - type: string (Must be exactly one of: 'title', 'bullets', 'image_left', 'image_right', 'chart')
  - instructions: string (Brief instructions for the content writer about what specific details to include)
  `;

  const userPrompt = `Topic: ${topic}`;

  try {
    const result = await fetchOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    // Handle potential variations in structure
    return result.slides || result;
  } catch (error) {
    console.error("Error generating outline");
    throw error;
  }
};

export const generateSlideContent = async (topic: string, slideInfo: OutlineSlide) => {
  const systemPrompt = `You are a startup pitch deck writer. Write content for a pitch deck slide based on the topic and instructions.
  Return a JSON object with exactly these keys:
  - content: string (The main text content. For 'bullets', use a markdown list. For 'chart', describe the data trend in 1 sentence. For images, write a descriptive paragraph.)
  - notes: string (Speaker notes for the presenter, 2-3 sentences)
  `;

  const userPrompt = `
  Startup Topic: "${topic}"
  Slide Title: "${slideInfo.title}"
  Slide Type: "${slideInfo.type}"
  Instructions: "${slideInfo.instructions}"
  `;

  try {
    const result = await fetchOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    return {
      content: result.content || "",
      notes: result.notes || ""
    };
  } catch (error) {
    console.error("Error generating slide content");
    return { content: "Error generating content. Please edit manually.", notes: "" };
  }
};

export const generateSingleSlideOutline = async (topic: string): Promise<OutlineSlide> => {
  const systemPrompt = `You are a pitch deck expert. Create a single slide outline about the requested topic.
  Return a JSON object with:
  - title: string
  - type: string (One of: 'title', 'bullets', 'image_left', 'image_right', 'chart')
  - instructions: string
  `;

  try {
    const result = await fetchOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Slide Topic: ${topic}` }
    ]);
    return result;
  } catch (error) {
    // Fallback
    return {
      title: "New Slide",
      type: "bullets",
      instructions: `Write about ${topic}`
    };
  }
};

export interface EditorAction {
  type: 'CREATE_DECK' | 'ADD_SLIDE' | 'REMOVE_SLIDE' | 'REORDER_SLIDE' | 'UPDATE_SLIDE' | 'CHAT';
  topic?: string; // For CREATE/ADD
  position?: number; // For ADD
  indices?: number[]; // For REMOVE (1-based)
  from?: number; // For REORDER (1-based)
  to?: number; // For REORDER (1-based)
  index?: number; // For UPDATE (1-based)
  instructions?: string; // For UPDATE
  response?: string; // For CHAT
}

export const determineEditorAction = async (
  userPrompt: string, 
  currentSlides: {id: string, title: string, type: string}[]
): Promise<EditorAction> => {
  
  // If no slides, likely a create request
  if (currentSlides.length === 0) {
    return { type: 'CREATE_DECK', topic: userPrompt };
  }

  const slidesContext = currentSlides.map((s, i) => ({ index: i + 1, title: s.title, type: s.type }));
  
  const systemPrompt = `You are an intelligent assistant for a presentation builder app.
  Analyze the user's request and the current deck structure to determine the intended action.
  
  Current Deck:
  ${JSON.stringify(slidesContext)}

  Return a JSON object with a "type" and the necessary parameters.
  
  Possible Types:
  1. "CREATE_DECK": User wants to start over or build a new deck. Param: "topic".
  2. "ADD_SLIDE": User wants to add a new slide. Params: "topic" (what the slide is about), "position" (optional 1-based index to insert at, default to after last slide).
  3. "REMOVE_SLIDE": User wants to delete one or more slides. Param: "indices" (array of 1-based integers).
  4. "REORDER_SLIDE": User wants to move a slide. Params: "from" (1-based index), "to" (1-based index).
  5. "UPDATE_SLIDE": User wants to change the design, layout, or content of a specific slide. Params: "index" (1-based), "instructions" (what to change, e.g. "make it a chart", "rewrite about X").
  6. "CHAT": User is asking a general question or the request is unclear/conversational. Param: "response" (a helpful text reply).

  Examples:
  - "Add a slide about market size" -> {"type": "ADD_SLIDE", "topic": "market size"}
  - "Remove slide 3" -> {"type": "REMOVE_SLIDE", "indices": [3]}
  - "Move slide 2 to the end" -> {"type": "REORDER_SLIDE", "from": 2, "to": 5}
  - "Change slide 4 to a chart" -> {"type": "UPDATE_SLIDE", "index": 4, "instructions": "Change layout to chart"}
  - "What is a pitch deck?" -> {"type": "CHAT", "response": "A pitch deck is..."}
  `;

  try {
    const result = await fetchOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    return result;
  } catch (error) {
    console.error("Error determining action", error);
    return { type: 'CHAT', response: "I'm having trouble understanding. Could you rephrase that?" };
  }
};
