
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

function getPrompt(prompt: string): string {
    return `
    You are a world-class frontend developer with a flair for creating creative and interactive content. Your response must be only the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not wrap it in markdown fences (\`\`\`) or add any other explanatory text.
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