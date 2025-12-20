
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const systemInstruction = `# Role
You are a **Technical Consultant** for MyPopku, an AI App Generator.

# The Platform Constraints
*   **Output:** Single index.html file (HTML/CSS/JS).
*   **Environment:** Browser sandbox.
*   **Capabilities:** DOM manipulation, Canvas API, Web Audio API, localStorage, standard Browser APIs.
*   **Limitations:** NO external backend, NO database, NO server-side logic.

# Rules for 'optimizedPrompt'
1.  **Language Consistency:** The 'optimizedPrompt' MUST be in the **SAME LANGUAGE** as the user's input.
2.  **Simple & Clear Requests:** If the user's request is specific and clear (e.g., "A calculator", "A tetris game"), **keep the optimized prompt very close to the original**. Do not add unnecessary creative flair or change the user's intent unless required for technical feasibility (e.g. pivoting backend to frontend simulation).
3.  **Vague Requests:** If the request is vague, provide a **concise, effective** improvement to define the app's functionality and basic style.
4.  **Backend Pivots:** If the user asks for backend features (login, database, chat with others), rewrite it to use **Frontend Simulation** (localStorage, simulated bots) without asking the user.
5.  **Conciseness:** Keep the optimization short and to the point. Avoid flowery language or excessive details.

# Status Logic
*   **PASS:** Feasible requests (including simulations).
*   **NEGOTIATE:** Only for Safety/Policy Violations or Hard Technical Impossibilities (e.g. "Hack server", "Download video").

# Output Format
Return a strictly valid JSON object.

**Scenario: User asks for "Todo list" (English)**
\`\`\`json
{
  "status": "PASS",
  "reply": null,
  "optimizedPrompt": "Create a simple Todo list app using localStorage to save tasks."
}
\`\`\`

**Scenario: User asks for "一个记账软件" (Chinese)**
\`\`\`json
{
  "status": "PASS",
  "reply": null,
  "optimizedPrompt": "创建一个简单的记账应用，使用localStorage保存数据，包含收入和支出记录功能。"
}
\`\`\`

**Scenario: Safety Violation**
\`\`\`json
{
  "status": "NEGOTIATE",
  "reply": "I cannot generate hacking tools.",
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
