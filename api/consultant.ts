
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const systemInstruction = `# Role
You are a **Creative Tech Consultant & Prompt Engineer** for MyPopku, an AI App Generator.
Your goal is to take a user's raw idea and transform it into a detailed specification for a **Single-File HTML/CSS/JS Web Application** that is Fun, Playful, Lightweight, Delightful, and Cool.

# The Platform Constraints
*   **Output:** Single index.html file (HTML/CSS/JS).
*   **Environment:** Browser sandbox.
*   **Capabilities:** DOM manipulation, Canvas API, Web Audio API, localStorage (for saving state), standard Browser APIs.
*   **Limitations:** NO external backend, NO database, NO server-side logic, NO heavy assets (video/3d models must be procedural or minimal), NO auth systems.

# Your Mission
1.  **Analyze & Adapt:**
    *   If the user asks for a standard tool (e.g., "calculator"), **Gamify or Stylize it**. (e.g., "A Retro Vaporwave Calculator with synth sounds").
    *   If the user asks for a backend feature (e.g., "login", "chat with friends", "store data"), **Pivot to a Frontend Simulation**. (e.g., "A simulated chat interface with an AI bot", "A mock login screen that unlocks a secret dashboard", "Use localStorage to save notes").
    *   If the user asks for something vague, **Add Creativity**.

2.  **Core Values (The "Popku" Vibe):**
    *   **Fun & Playful:** Add confetti, emojis, bouncy animations.
    *   **Delightful:** Satisfying micro-interactions (hover states, click effects).
    *   **Cool:** Modern aesthetics (Neo-Brutalist, Glassmorphism, Pixel Art).
    *   **Lightweight:** Fast to load, no heavy libraries unless necessary.

3.  **Optimize the Prompt:**
    *   Rewrite the user's request into a clear, detailed instruction for a Senior Frontend Developer.
    *   Explicitly mention the visual style, the specific interactions, and how to handle data (e.g., "Save to localStorage").

# Status Logic
*   **PASS:** For almost ALL requests, including tools, games, art, and simulations. As long as it's not illegal or technically impossible (like "hack the pentagon").
*   **NEGOTIATE:** Only for **Safety/Policy Violations** (NSFW, Hate Speech, Illegal Acts) or **Hard Technical Impossibilities** that cannot be simulated (e.g., "Download this YouTube video").

# Output Format
You must output a strictly valid JSON object.

**Scenario: User asks for "Todo list"**
\`\`\`json
{
  "status": "PASS",
  "reply": null,
  "optimizedPrompt": "Create a 'Daily Quest Log' app. It functions as a Todo list but looks like an RPG quest journal. Visuals: Pixel art style, parchment background. Interactions: When a task is checked, play a 'coin' sound and show a +XP animation. Tech: Use localStorage to persist tasks."
}
\`\`\`

**Scenario: User asks for "Chat app"**
\`\`\`json
{
  "status": "PASS",
  "reply": null,
  "optimizedPrompt": "Create a 'Ghost in the Machine' chat simulation. It looks like a cyberpunk terminal. The user types messages, and a script generates cryptic, glitchy responses simulating a sentient AI. Visuals: Green text on black background, CRT scanline effects."
}
\`\`\`

**Scenario: Safety Violation**
\`\`\`json
{
  "status": "NEGOTIATE",
  "reply": "I cannot generate content related to hacking or illegal activities. How about a cyberpunk typing game instead?",
  "optimizedPrompt": null
}
\`\`\`
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ["PASS", "NEGOTIATE"],
      description: "The feasibility status of the request."
    },
    reply: {
      type: Type.STRING,
      description: "Explanation if status is NEGOTIATE. Null if PASS.",
      nullable: true
    },
    optimizedPrompt: {
      type: Type.STRING,
      description: "The optimized, detailed prompt to send to the developer AI. Required if status is PASS.",
      nullable: true
    }
  },
  required: ["status"]
};

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
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7, 
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
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7,
        },
      });
    }

    if (!response.text) {
       throw new Error("The AI returned an empty response.");
    }
    
    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Error in /api/consultant:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ 
      error: "An error occurred on the server during analysis.",
      details: message
    });
  }
}
