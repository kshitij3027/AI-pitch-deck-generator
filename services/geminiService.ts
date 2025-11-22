import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client
// The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface OutlineSlide {
  title: string;
  type: 'title' | 'bullets' | 'image_left' | 'image_right' | 'chart';
  instructions: string;
}

export interface EditorAction {
  type: 'CREATE_DECK' | 'ADD_SLIDE' | 'REMOVE_SLIDE' | 'REORDER_SLIDE' | 'UPDATE_SLIDE' | 'CHAT';
  topic?: string;
  position?: number;
  indices?: number[];
  from?: number;
  to?: number;
  index?: number;
  instructions?: string;
  response?: string;
}

export const generateDeckOutline = async (topic: string): Promise<OutlineSlide[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a startup pitch deck expert. Create a compelling pitch deck outline for a startup about: "${topic}".
      
      Return a JSON array of 6-10 slides that tell a complete story (e.g., Problem, Solution, Market, Business Model, Team).
      
      For each slide, specify:
      - title: The headline of the slide.
      - type: The visual layout ('title', 'bullets', 'image_left', 'image_right', 'chart').
      - instructions: Brief instructions for the content writer about what specific details to include on this slide.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["title", "bullets", "image_left", "image_right", "chart"] },
              instructions: { type: Type.STRING }
            },
            required: ["title", "type", "instructions"]
          }
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text) as OutlineSlide[];
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Error generating outline:", error);
    throw error;
  }
};

export const generateSlideContent = async (topic: string, slideInfo: OutlineSlide) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write the content for a pitch deck slide.
      
      Startup Topic: "${topic}"
      Slide Title: "${slideInfo.title}"
      Slide Type: "${slideInfo.type}"
      Instructions: "${slideInfo.instructions}"
      
      Return JSON with:
      - content: The main text content. 
        - For 'bullets': Return a markdown list string (e.g. "- Item 1\n- Item 2").
        - For 'chart': Return a brief sentence describing the trend or data (e.g. "Revenue projected to grow 300% YoY").
        - For 'image_*': Return a paragraph of text.
      - notes: Speaker notes for the presenter (2-3 sentences).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["content", "notes"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as { content: string; notes: string };
    }
    throw new Error("No slide content generated");
  } catch (error) {
    console.error("Error generating slide content:", error);
    // Fallback to avoid breaking the UI loop
    return { content: "Error generating content. Please edit manually.", notes: "" };
  }
};

export const generateSingleSlideOutline = async (topic: string): Promise<OutlineSlide> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a pitch deck expert. Create a single slide outline about the requested topic: "${topic}".
      
      Return a JSON object with:
      - title: string
      - type: string (One of: 'title', 'bullets', 'image_left', 'image_right', 'chart')
      - instructions: string`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["title", "bullets", "image_left", "image_right", "chart"] },
            instructions: { type: Type.STRING }
          },
          required: ["title", "type", "instructions"]
        }
      }
    });
    if (response.text) return JSON.parse(response.text);
    throw new Error("No content");
  } catch (error) {
    console.error("Error generating single slide:", error);
    return {
      title: "New Slide",
      type: "bullets",
      instructions: `Write about ${topic}`
    };
  }
};

export const determineEditorAction = async (
  userPrompt: string, 
  currentSlides: {id: string, title: string, type: string}[]
): Promise<EditorAction> => {
  const slidesContext = currentSlides.map((s, i) => ({ index: i + 1, title: s.title, type: s.type }));
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an intelligent assistant for a presentation builder app.
        Analyze the user's request and the current deck structure to determine the intended action.
        
        Current Deck:
        ${JSON.stringify(slidesContext)}
        
        User Request: "${userPrompt}"

        Return a JSON object with a "type" and the necessary parameters.
        
        Possible Types:
        1. "CREATE_DECK": User wants to start over or build a new deck. Param: "topic".
        2. "ADD_SLIDE": User wants to add a new slide. Params: "topic" (what the slide is about), "position" (optional 1-based index to insert at, default to after last slide).
        3. "REMOVE_SLIDE": User wants to delete one or more slides. Param: "indices" (array of 1-based integers).
        4. "REORDER_SLIDE": User wants to move a slide. Params: "from" (1-based index), "to" (1-based index).
        5. "UPDATE_SLIDE": User wants to change the design, layout, or content of a specific slide. Params: "index" (1-based), "instructions" (what to change, e.g. "make it a chart", "rewrite about X").
        6. "CHAT": User is asking a general question or the request is unclear/conversational. Param: "response" (a helpful text reply).
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['CREATE_DECK', 'ADD_SLIDE', 'REMOVE_SLIDE', 'REORDER_SLIDE', 'UPDATE_SLIDE', 'CHAT'] },
                    topic: { type: Type.STRING },
                    position: { type: Type.INTEGER },
                    indices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                    from: { type: Type.INTEGER },
                    to: { type: Type.INTEGER },
                    index: { type: Type.INTEGER },
                    instructions: { type: Type.STRING },
                    response: { type: Type.STRING }
                },
                required: ['type']
            }
        }
    });
    
    if (response.text) return JSON.parse(response.text);
    return { type: 'CHAT', response: "I didn't understand that." };
  } catch (error) {
    console.error("Error determining action:", error);
    return { type: 'CHAT', response: "I'm having trouble understanding. Could you rephrase that?" };
  }
};

export default ai;