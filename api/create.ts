

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
    You are a world-class frontend developer with a flair for creating creative and interactive content/apps. 
    Your task is to generate a JSON object containing the application code and metadata based on the user's prompt.

    **App Requirements:**
    1.  **Mobile-First & Interactive:** The app must be fully functional, responsive, and SEO-friendly.
    2.  **Robustness:** Ensure event listeners are attached correctly after the DOM loads. Handle user interactions (clicks, inputs) robustly.
    3.  **Persistence (Local):** The app MUST automatically save its entire state to \`localStorage\` whenever data changes and restore it on load.
    4.  **Persistence (Cloud - Conditional):** IF the app involves user-generated content (diary, drawing, scores, etc.), implement the following auto-sync logic:
        *   Get App ID: \`const appId = window.parent.location.pathname.startsWith('/view/') ? window.parent.location.pathname.split('/').pop() : null;\`
        *   Load: On load, if \`appId\` exists, \`fetch('/api/storage?id=\${appId}\`). Merge cloud data into state.
        *   Save: On state change, if \`appId\` exists, \`POST\` to \`/api/storage?id=\${appId}\`. Use debounce.
        *   UI: Show a small "☁️ Saved" indicator.
    5.  **Language Consistency:** All generated content, including the App UI text, Title, Description, and Keywords, MUST be in the same language as the User Prompt. (e.g., if the prompt is Chinese, the app and metadata must be in Chinese).

    **Output JSON Requirements:**
    *   **title:** A short, catchy name for the app (in the prompt's language).
    *   **description:** An engaging summary for SEO (in the prompt's language).
    *   **keywords:** Relevant SEO tags (in the prompt's language).
    *   **html:** The raw HTML code starting with <!DOCTYPE html>...

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