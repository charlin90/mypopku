
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedConcept } from '../types.js';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    html: {
      type: Type.STRING,
      description: "A string of HTML code for the interactive elements. This will be placed inside a div with id 'interactive-stage'. It should not include html, head, or body tags.",
    },
    css: {
      type: Type.STRING,
      description: "A string of CSS rules for the generated HTML. This CSS will be injected into a <style> tag on the page. Use modern, clean design principles.",
    },
    js: {
      type: Type.STRING,
      description: "A string of JavaScript code to make the HTML interactive. It must be self-contained. CRITICAL: This script MUST listen for user events on elements inside '#interactive-stage' and dynamically update the innerHTML of '#explanation-panel' to provide real-time, contextual explanations for each user action.",
    },
    explanation: {
      type: Type.STRING,
      description: "A string of text in markdown format that serves as the *initial* state for the explanation panel. It should be very brief: introduce the concept and prompt the user to perform their first interaction. The detailed explanations are handled by the JavaScript.",
    },
    libraryUrl: {
      type: Type.STRING,
      description: "An optional CDN URL for a single, well-known JavaScript library (like D3.js, Three.js, etc.) if it is essential for the experiment. If not needed, this field should be omitted.",
    },
  },
  required: ["html", "css", "js", "explanation"],
};

function getPrompt(concept: string): string {
    return `
    You are an expert frontend developer and creative designer specializing in educational toys for Gen Z.

    Your task is to create a complete, fun, and interactive learning module for the concept: "${concept}".
    The module follows a "Guided Discovery" philosophy: the user learns by doing.
    Generate a JSON object that strictly adheres to the provided schema.

    ---
    **Guidelines: Read and obey these rules without exception.**
    ---

    **1. HTML: Semantic & Interactive Foundation**
    *   Create semantic HTML. The root elements will be injected into a container div '#interactive-stage'.
    *   **CRITICAL:** Every interactive element MUST have a unique \`id\` attribute.
    *   Include a reset button with \`id="reset-btn"\` and the text "Reset".

    **2. CSS: "Pop / Neo-Brutalist" Aesthetic (Light Theme)**
    *   **THEME:** You MUST use a **LIGHT THEME**. Backgrounds should be white (#ffffff) or very light pastels. Text should be dark (#111827).
    *   **STYLE:** Use the "Neo-Brutalist" or "Clean Cartoon" style. 
        *   **Borders:** Use thick, solid borders (e.g., \`2px solid #000000\`) for containers, buttons, and cards.
        *   **Shadows:** Use hard, offset shadows (e.g., \`box-shadow: 4px 4px 0px 0px #000000\`).
        *   **Colors:** Use vibrant, high-saturation accent colors (Pink, Cyan, Lime, Yellow) against the white background.
        *   **Rounded Corners:** Use \`border-radius: 12px\` or \`16px\` for a friendly feel.
    *   **Layout:**
        *   **Main Container:** Flex column. Visualization first (min-height: 300px), controls underneath.
        *   **Controls:** Center them. On desktop, arrange horizontally.
    *   **Animations:** Use bouncy, springy transitions (cubic-bezier) for movements to make it feel playful.

    **3. JavaScript: Flawless, Real-time Interactivity**
    *   **Interaction:** Every user action must produce an immediate visual reaction.
    *   **Query & Guard:** For EACH \`id\`, use \`document.querySelector('#id')\` with a null check.
    *   **Explanation Update:** Inside EVERY event listener, update the \`innerHTML\` of '#explanation-panel' to explain what happened in a fun, conversational tone.
    *   **Reset:** The reset button must restore the initial state (visuals + explanation).

    **4. Explanation: Short & Punchy**
    *   Keep the initial markdown explanation very brief. Use bold text and emojis 🌟 to make it inviting.

    **5. External Libraries**
    *   Use libraries like D3.js or Three.js only if absolutely necessary for complex visualizations.

    Now, generate the raw JSON object for the concept: "${concept}".
  `;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Check for API Key at the start of the handler.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({
      error: "Server configuration error.",
      debug: {
        message: "The API_KEY environment variable is not set on the server."
      }
    });
  }

  // Initialize the AI client inside the handler
  const ai = new GoogleGenAI({ apiKey });
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { concept } = req.body;

  if (!concept || typeof concept !== 'string' || concept.trim() === '') {
    return res.status(400).json({ error: 'Concept is required.' });
  }

  try {
    const prompt = getPrompt(concept);
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
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
        contents: prompt,
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
    
    let responseText = response.text.trim();
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = responseText.match(jsonRegex);

    if (match && match[1]) {
      responseText = match[1];
    }
    
    const parsedObject = JSON.parse(responseText);

    return res.status(200).json(parsedObject as GeneratedConcept);

  } catch (error) {
    console.error("Error in /api/generate:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    
    return res.status(500).json({ 
      error: "An error occurred on the server.",
      debug: { message }
    });
  }
}