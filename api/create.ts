
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

function getPrompt(prompt: string): string {
    return `
    You are an expert frontend developer specializing in building creative, interactive, and mobile-first single-page applications.

    Task: Create a complete, self-contained HTML file based on this request: "${prompt}".

    Strict Requirements:
    1. **Single File**: All CSS must be in <style> tags and all JavaScript in <script> tags within the HTML. No external CSS/JS links (unless CDN for well-known libraries like Three.js/p5.js is absolutely necessary).
    2. **Mobile First**: Use a responsive layout. Ensure touch targets are large enough. Use the viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">.
    3. **Interactivity**: The app must be fully functional. Ensure event listeners are attached correctly after the DOM loads. Handle user interactions (clicks, inputs) robustly.
    4. **SEO & Semantics**: Use semantic HTML5 tags (main, header, section). Include a relevant <title> and <meta name="description">.
    5. **Design**: Make it visually appealing with modern CSS.
    6. **Output**: Return ONLY the raw HTML code starting with <!DOCTYPE html>. Do not include markdown backticks (\`\`\`) or any explanations.
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