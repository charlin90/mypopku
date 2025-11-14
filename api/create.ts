
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

function getPrompt(prompt: string): string {
    return `
    You are a world-class frontend developer with a flair for creative and interactive web design.
    Your task is to generate a single, self-contained HTML file based on the user's prompt.

    User Prompt: "${prompt}"

    ---
    **Requirements:**
    ---
    1.  **Single File:** Your entire output must be a single block of HTML code. All CSS must be inside a \`<style>\` tag in the \`<head>\`, and all JavaScript must be inside a \`<script>\` tag at the end of the \`<body>\`. Do not use external files.
    2.  **Dark Theme:** The design must use a modern, elegant dark theme. Use a color palette based on dark grays or blues (e.g., body background #111827) with a vibrant accent color for interactive elements. Text should be a light color for contrast.
    3.  **Responsiveness:** The layout must be fully responsive and look great on both mobile devices and large desktop screens. Use modern CSS like flexbox or grid for layout.
    4.  **Interactivity:** The output must be interactive. Use JavaScript to respond to user actions like clicks, mouse movements, or input changes. The experience should be engaging.
    5.  **Visual Appeal:** The final result should be visually stunning. Use smooth transitions and animations where appropriate to enhance the user experience.
    6.  **Libraries:** Prioritize vanilla HTML, CSS, and JavaScript. However, for complex requests where a library is the best tool for the job (e.g., 3D scenes with Three.js, data visualizations with D3.js, or complex UIs with Tailwind CSS), you MUST use it. Include the library from a reputable CDN in the HTML \`<head>\`.
    7.  **Content:** Ensure the content of the page is directly related to the user's prompt and fulfills their request.
    
    Now, generate the complete HTML code. Your response must be only the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not wrap it in markdown fences (\`\`\`) or add any other explanatory text.
  `;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({ error: "Server configuration error." });
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
        model: "gemini-2.5-pro",
        contents: geminiPrompt,
        config: {
          temperature: 0.7,
        },
    });

    const htmlContent = response.text;

    if (!htmlContent) {
      const finishReason = response.candidates?.[0]?.finishReason;
      let errorMessage = "The AI returned an empty response. Please try again or rephrase your prompt.";
      if (finishReason === 'SAFETY') {
        errorMessage = "The request was blocked for safety reasons. Please try a different prompt.";
      }
      return res.status(500).json({ error: errorMessage });
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
