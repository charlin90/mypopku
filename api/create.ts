import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function getPrompt(prompt: string): string {
    return `
    You are a world-class frontend developer with a flair for creating creative and interactive content/app. Your response must be only the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not wrap it in markdown fences (\`\`\`) or add any other explanatory text.mobile-first, SEO-friendly, interactive single-page applications.
    The app must be fully functional. Ensure event listeners are attached correctly after the DOM loads. Handle user interactions (clicks, inputs) robustly.
    
    **CRITICAL REQUIREMENT: PERSISTENCE & CLOUD SYNC**
    1.  **Local State (MANDATORY):** The app MUST automatically save its entire state (all input values, text areas, drawings as Base64, positions, scores, etc.) to \`localStorage\` whenever data changes. Restore this state immediately when the page loads so user progress is never lost.
    
    2.  **Automatic Cloud Sync (CONDITIONAL):**
        *   **DECISION RULE:** Implement this logic **ONLY IF** the app involves user-generated content that needs saving (e.g., a diary, drawing canvas, todo list, game high scores, custom dashboard).
        *   **Logic:**
            *   **Get App ID:** \`const appId = window.parent.location.pathname.startsWith('/view/') ? window.parent.location.pathname.split('/').pop() : null;\`
            *   **Load (Init):** On page load, if \`appId\` exists, \`fetch('/api/storage?id=\${appId}\`). If cloud data returns, merge it into the app state (prioritizing cloud data over local).
            *   **Auto-Save:** Whenever state changes (and is saved to localStorage), if \`appId\` exists, \`POST\` the state to \`/api/storage?id=\${appId}\`. **Use a debounce (e.g. 1000ms)** to avoid frequent network requests.
            *   **UI Feedback:** Add a small, unobtrusive fixed status indicator (e.g., bottom-right) showing "☁️ Saved" or "☁️ Saving..." to inform the user.

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

  const { prompt, userId } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  // Check Daily Limit for Registered Users
  if (userId) {
    try {
      // 1. Determine User Limit based on Plan
      let dailyLimit = 3;
      const planName = await redis.hget<string>('user_subscriptions', userId);
      
      if (planName) {
        const plan = planName.toLowerCase();
        if (plan.includes('starter')) {
            dailyLimit = 40;
        } else if (plan.includes('pro')) {
            dailyLimit = 140;
        }
      }

      // 2. Track Usage (Beijing Time UTC+8)
      const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
      const key = `daily_usage:${date}`;
      
      const usage = await redis.hincrby(key, userId, 1);
      
      if (usage === 1) {
        await redis.expire(key, 86400);
      }

      // 3. Enforce Limit
      if (usage > dailyLimit) {
        return res.status(402).json({ error: 'Daily limit reached' });
      }

    } catch (e) {
      console.error("Redis usage/auth check error:", e);
    }
  }

  try {
    const geminiPrompt = getPrompt(prompt);
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: geminiPrompt,
        config: {
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
          temperature: 1.0,
        },
      });
    }

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