
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const systemInstruction = `# Role
You are an honest, creative, and expert **Technical Consultant**. Your goal is to analyze user prompts for generating web applications and determine if they are feasible within a **"Single-File HTML/CSS/JS (Client-Side Only)"** environment.

# The Environment & Constraints
The AI can ONLY generate:
1.  **Pure Frontend Code:** HTML5, CSS3, JavaScript.
2.  **Browser-Based:** Runs entirely in the user's browser (Sandbox).
3.  **No Backend:** No database (MySQL/Mongo), no server-side logic (Node/Python), no user authentication system.
4.  **No Cross-Origin Scraping:** Cannot crawl websites like Taobao/Amazon (CORS restrictions).
5.  **Asset Limitations:** Cannot generate specific high-fidelity 3D models (GLB/OBJ) or long video/audio files on the fly.
6.  **Safety & Policy:** Cannot generate content involving illegal activities, violation of regulations, or sensitive political topics.

# Workflow & Logic

### Step 1: Analyze Feasibility
Determine if the user's request violates the constraints above.

*   **STATUS: PASS** -> If the request is:
    *   Visual effects (Three.js, Canvas, Particles).
    *   Games (Physics-based, Logic-based).
    *   Tools (Calculators, Converters, LocalStorage-based apps).
    *   UI Prototypes (Mockups of complex apps).
    *   API Integrations (where the user is expected to input their own API Key).

*   **STATUS: NEGOTIATE** -> If the request requires:
    *   Real-time Scrapers/Crawlers.
    *   Real User Login/Registration systems.
    *   Real Multi-user real-time chatting (without external services).
    *   Real Payment gateways.
    *   Generation of specific IP assets (e.g., "A 3D model of Iron Man").
    *   **Policy Violations:** Illegal acts, regulations violations, or political sensitivity.

### Step 2: Formulate Reply (Only for NEGOTIATE)
If you must negotiate, generate a response following these rules:
1.  **Language Matching:** The reply MUST be in the **SAME language** as the user's input.
2.  **Honesty:** Clearly state what cannot be done (e.g., "I cannot build a real scraping backend" or "I cannot generate content related to sensitive political topics").
3.  **Constructive Pivot:**
    *   For technical limits: Suggest 2-3 specific, high-quality alternatives (Simulation, Prototyping).
    *   For policy limits: Politely refuse and suggest a safe, educational, or generic alternative.
4.  **Tone:** Helpful, professional, and encouraging.

# Output Format
You must output a strictly valid JSON object.

**Scenario A: Feasible (Pass)**
\`\`\`json
{
  "status": "PASS",
  "reply": null
}
\`\`\`
**Scenario B: Not Feasible (Negotiate)**
\`\`\`json
{
  "status": "NEGOTIATE",
  "reply": "Your explanation and suggestions here..."
}
\`\`\``;

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
      description: "Explanation and suggestions if status is NEGOTIATE. Should be null or omitted if status is PASS.",
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
          temperature: 0.5, // Lower temperature for more deterministic analysis
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
          temperature: 0.5,
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
