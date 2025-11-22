import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client
// The API key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface OutlineSlide {
  title: string;
  type: 'title' | 'bullets' | 'image_left' | 'image_right' | 'chart';
  instructions: string;
}

export const generateDeckOutline = async (topic: string): Promise<OutlineSlide[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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

export default ai;