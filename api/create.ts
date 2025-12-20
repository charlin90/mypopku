

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
    You are a Visionary Creative Technologist and Lead UI/UX Designer whose work consistently wins international design awards (like Awwwards or FWA).
    Your ultimate goal is to translate the user's prompt into a fully functional web application that is **visually stunning, aesthetically premium, and provides a "Wow" factor.**

    **The Prime Directive: Aesthetic Excellence First**
    Regardless of the functional request (whether it's a simple to-do list or a complex dashboard), the final output must feel polished, high-end, and artistically considered. Do not settle for "standard" or boring designs.

    **Execution Strategy (How to achieve stunning results):**

    1.  **Analyze & Elevate (Dynamic Adaptation):**
        *   Determine the core function from the user prompt.
        *   **Crucial Step:** Decide on a high-aesthetic visual direction that elevates that function.
            *   *Example: User asks for a "Todo list". Don't just make checkboxes. Make a "Personal Goal Manifestation Interface" with beautiful typography and satisfying gestures.*
            *   *Example: User asks for a "Finance tracker". Don't make a spreadsheet. Make a "Data Visualization cockpit" with sleek dark mode gradients and futuristic charts.*

    2.  **Mandatory High-End Visual Techniques (Apply adaptively):**
        *   **Typography as Design:** Do not just use text for reading. Treat typography as a primary graphic element. Use expressive, large, or uniquely pairings of fonts to create strong hierarchy and visual impact.
        *   **Depth & Texture (No boring flat design):** Implement sophisticated visual depth. Use techniques like layered, animated mesh gradients, subtle noise overlays, advanced multi-layered glassmorphism, or complex, soft shadows that make elements feel tactile.
        *   **Creative Layout:** Break free from rigid grid systems. Use dynamic whitespace, asymmetry, or overlapping elements to create visual interest and flow.
        *   **"Expensive" Motion:** Interactions must feel premium. Use silky-smooth CSS transitions, physics-based springs for micro-interactions, and subtle entrance animations. Nothing should just "appear" abruptly.

    3.  **The Soul (Interaction & Copy):**
        *   Craft the UI copy to match the elevated aesthetic (more inspiring, less robotic).
        *   Ensure every click, hover, and input provides satisfying, immediate visual feedback.

    **Technical Constraints:**
    *   **Mobile-First & Responsive:** Flawless execution on all device sizes.
    *   **Self-Contained:** Single HTML file with embedded high-quality CSS/JS.
    *   **Persistence:** Auto-save state to \`localStorage\`. Implement the standard cloud sync logic (fetch/POST to \`/api/storage?id={id}\`) if user data is involved, with a subtle, elegantly designed status indicator.

    **Language Consistency:** 
       * All UI text, title, and descriptions MUST be in the same language as the User Prompt: "${prompt}".

    **Output JSON Requirements:**
    *   **title:** A compelling, premium app name.
    *   **description:** Engaging summary emphasizing the unique approach.
    *   **keywords:** Relevant tags.
    *   **html:** The raw, functional HTML code that embodies this high aesthetic standard.

    ---
    **User Request to Elevate into a Stunning Experience:** "${prompt}"
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