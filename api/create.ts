

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, catchy, and descriptive title for the application (max 50 chars)." },
    description: { type: Type.STRING, description: "A concise, SEO-friendly description of what the application does (max 160 chars)." },
    keywords: { type: Type.STRING, description: "Comma-separated SEO keywords relevant to the application." },
    html: { type: Type.STRING, description: "The complete, functional, single-file HTML code for the application." }
  },
  required: ["title", "description", "keywords", "html"]
};

function getPrompt(prompt: string): string {
    return `
    You are a world-class frontend developer and UI/UX designer known for "Emotional Design."
    Your task is to generate a JSON object containing the application code and metadata based on the user's prompt.

    **App Requirements:**
    1. **Visual Style: "Soft-Doodle Dopamine" (治愈系多巴胺)**
       * **Core Aesthetic:** Create a youthful, "healing" atmosphere using a Macaron palette (mint, soft pink, lavender, creamy yellow).
       * **Shapes:** Use **super-rounded corners (32px to 48px)** and **soft outlines (2px-3px stroke)** to give elements a "sticker-like" or "hand-drawn" feel.
       * **Layout:** A flexible **Organic Bento Grid**. Elements should feel like floating cards with generous white space (24px+).
       * **Material:** Avoid cold glassmorphism. Instead, use "Milk-tinted" solid colors or very soft, creamy gradients.
       * **Micro-interactions:** Every button and card must have a **Spring Physics (Jelly-like)** scale effect on hover/tap.

    2. **Emotional Interaction (The Soul):**
       * **Ritualistic UX:** Use warm, emotional copywriting (e.g., "Catch a Thought" instead of "Add Note", "Exhale" instead of "Clear").
       * **Dynamic Feedback:** The UI should react to user emotions. Use cute SVG illustrations or animated emojis (personified with faces) to mirror the app's state.
       * **Visual Keepsake:** The final result should look as beautiful as a "Digital Poster" or a "Journal Spread."

    3. **Technical Functionality:**
       * **Mobile-First:** Ensure perfect responsiveness using modern CSS (Flexbox/Grid).
       * **Persistence:** 
         - Save/Restore state using \`localStorage\`.
         - **Cloud Sync:** If the app involves user data, use this logic: 
           \`const appId = window.parent.location.pathname.startsWith('/view/') ? window.parent.location.pathname.split('/').pop() : null;\`
           Fetch data from \`/api/storage?id=\${appId}\` on load and POST back (debounced) on changes. Show a tiny "☁️" indicator.
       * **Robustness:** Ensure all event listeners are properly managed and the code is self-contained (HTML/CSS/JS in one string).

    4. **Language Consistency:** 
       * All UI text, title, and descriptions MUST be in the same language as the User Prompt: "${prompt}".

    **Output JSON Requirements:**
    * **title:** Catchy name of the app.
    * **description:** SEO-friendly, emotional summary.
    * **keywords:** Relevant tags.
    * **html:** Complete <!DOCTYPE html> code including all styles and scripts.

    User Prompt: "${prompt}"
  `;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({ error: 'Server configuration error.' });
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  // Track IP usage for statistics
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const realIp = ip ? ip.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    
    // Increment the count for this IP in the hash 'ai_generations_by_ip'
    await redis.hincrby('ai_generations_by_ip', realIp, 1);
  } catch (err) {
    console.error("Failed to track IP usage:", err);
  }

  try {
    const geminiPrompt = getPrompt(prompt);
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: geminiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 1.0,
        },
      });
    } catch (error) {
      const backupKey = process.env.API_KEY_A;
      if (!backupKey) {
        throw error;
      }
      console.warn('Primary API key failed, retrying with API_KEY_A');
      const backupAi = new GoogleGenAI({ apiKey: backupKey });
      response = await backupAi.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: geminiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 1.0,
        },
      });
    }

    if (!response.text) {
       throw new Error("The AI returned an empty response.");
    }
    
    // The response is guaranteed to be JSON structure by responseSchema
    const parsedData = JSON.parse(response.text);
    
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Error in /api/create:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ 
      error: "An error occurred on the server during content generation.",
      details: message
    });
  }
}