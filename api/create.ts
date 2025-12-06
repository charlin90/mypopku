
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

function getPrompt(prompt: string): string {
    return `
    You are a world-class frontend developer with a flair for creating creative and interactive content/app. Your response must be only the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not wrap it in markdown fences (\`\`\`) or add any other explanatory text.mobile-first, SEO-friendly, interactive single-page applications.
    The app must be fully functional. Ensure event listeners are attached correctly after the DOM loads. Handle user interactions (clicks, inputs) robustly.
    
    **CRITICAL REQUIREMENT: PERSISTENCE & CLOUD SYNC**
    1.  **Local State (MANDATORY):** The app MUST automatically save its entire state (all input values, text areas, drawings as Base64, positions, scores, etc.) to \`localStorage\` whenever data changes. Restore this state immediately when the page loads so user progress is never lost.
    
    2.  **Cloud Sync Button (CONDITIONAL):**
        *   **DECISION RULE:** Include this button and logic **ONLY IF** the app involves user-generated content that needs saving (e.g., a diary, drawing canvas, todo list, game high scores, custom dashboard). If the app is a stateless simulation, visual demo, or simple calculator, **DO NOT** include this button.
        *   **UI:** Add a button with \`id="cloud-sync-btn"\` and text "Cloud Sync ☁️".
        *   **Position:** \`position: fixed; top: 80px; right: 20px; z-index: 9999;\` (Ensures visibility below main nav).
        *   **Style:** White background, black border (2px), bold text, rounded corners, shadow.
        *   **Logic:**
            *   **Get App ID:** \`const appId = window.parent.location.pathname.startsWith('/view/') ? window.parent.location.pathname.split('/').pop() : null;\`
            *   **Save (Click):** If \`!appId\`, alert("Please click 'Share' in the top menu first to create a permanent link."); Else, gather the state object and \`POST\` it to \`/api/storage?id=\${appId}\`. Alert "Saved to Cloud! ☁️" on success.
            *   **Load (Init):** On page load, if \`appId\` exists, \`fetch('/api/storage?id=\${appId}\`). If cloud data returns, merge it into the app state (prioritizing cloud data over local).

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

  try {
    const geminiPrompt = getPrompt(prompt);
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: geminiPrompt,
        config: {
          temperature: 1.0,
        },
    });

    let htmlContent = response.text;

    if (!htmlContent) {
      const finishReason = response.candidates?.[0]?.finishReason;
      let errorMessage = "The AI returned an empty response. Please try again or rephrase your prompt.";
      if (finishReason === 'SAFETY') {
        errorMessage = "The request was blocked for safety reasons. Please try a different prompt.";
      }
      return res.status(500).json({ error: errorMessage });
    }
    
    // Robust parsing: clean potential markdown fences before sending.
    htmlContent = htmlContent.trim();
    const codeBlockRegex = /```(?:html)?\s*([\s\S]*?)\s*```/;
    const match = htmlContent.match(codeBlockRegex);

    if (match && match[1]) {
      htmlContent = match[1];
    }
    
    return res.status(200).json({ html: htmlContent });

  } catch (error) {
    console.error("Error in /api/create:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ 
      error: "An error occurred on the server during content generation.",
      details: message
    });
  }
}