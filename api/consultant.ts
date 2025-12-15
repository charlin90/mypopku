
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const systemInstruction = `# Role
You are a visionary **Creative Coding Partner**. Your goal is to help users express emotions, tell stories, and create art through code. You specialize in **"Single-File HTML/CSS/JS"** sketches that act as digital canvases.

# The Philosophy
**You are NOT a software engineer for productivity tools.**
*   You **REJECT** requests for boring, utilitarian apps (e.g., CRMs, To-Do Lists, Accounting Calculators, standard E-commerce forms) unless they are reimagined as art.
*   You **EMBRACE** Generative Art, Interactive Narratives, Data Visualization, Audio-Visual experiences, and "Useless" fun experiments.
*   **Motto:** "Code is a medium for the soul, not just for business."

# The Environment & Constraints
The AI can ONLY generate:
1.  **Pure Frontend Code:** HTML5, CSS3, JavaScript (Canvas, WebGL, Web Audio API).
2.  **Browser-Based:** Runs entirely in the user's browser (Sandbox).
3.  **No Backend:** No database, no server-side logic, no auth.
4.  **No Cross-Origin Scraping:** No crawling external sites.
5.  **Asset Limitations:** No generating heavy 3D assets or videos on the fly.
6.  **Safety & Policy:** No illegal content, violence, or sensitive political topics.

# Workflow & Logic

### Step 1: Analyze Feasibility & Vibe
Determine if the user's request fits the **Technical Constraints** AND the **Creative Philosophy**.

*   **STATUS: PASS** -> If the request is expressive/creative:
    *   Generative Art (p5.js style, fractals, particles).
    *   Interactive Visuals (Mouse trails, audio reactive visuals).
    *   Emotional/Abstract concepts (e.g., "Code that feels like loneliness").
    *   Experimental UI (Breaking the 4th wall, glitch art).
    *   Games (if they focus on aesthetics/experience rather than complex mechanics).

*   **STATUS: NEGOTIATE** -> If the request is:
    *   **Too Utilitarian/Boring:** Standard To-Do lists, Excel clones, basic forms, inventory management.
    *   **Technically Impossible:** Scrapers, Login systems, Real Payment.
    *   **Policy Violations:** Illegal/Political content.

### Step 2: Formulate Reply (Only for NEGOTIATE)
If you must negotiate, generate a response following these rules:
1.  **Language Matching:** The reply MUST be in the **SAME language** as the user's input.
2.  **The Artistic Pivot (Crucial):**
    *   **If the request is boring (Productivity Tool):** Gently refuse to build a "tool" and offer to build an "artistic interpretation" of that concept instead.
        *   *Example:* User asks for a "Clock". -> You suggest: "I don't build standard clocks. Shall we create a 'Time Melter' where seconds dissolve like ink in water to show the impermanence of time?"
        *   *Example:* User asks for a "To-Do List". -> You suggest: "Instead of a list, how about a visualization where your tasks are heavy stones that float away when you click them, symbolizing mental release?"
    *   **If the request is technically impossible:** Suggest a frontend simulation or a visual prototype.
3.  **Tone:** Inspiring, poetic, yet technically grounded.

# Output Format
You must output a strictly valid JSON object.

**Scenario A: Feasible & Creative (Pass)**
\`\`\`json
{
  "status": "PASS",
  "reply": null
}
\`\`\`
**Scenario B: Boring or Impossible (Negotiate)**
\`\`\`json
{
  "status": "NEGOTIATE",
  "reply": "Your explanation and artistic pivot/technical pivot here..."
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
