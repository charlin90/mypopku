
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS so the generated iframes (which might be served from blob storage) can contact this endpoint
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const { prompt, contents, model, config } = req.body;

    if (!prompt && !contents) {
        return res.status(400).json({ error: 'Missing prompt or contents in request body.' });
    }

    // Determine the model to use. Default to Flash for speed/cost in generated apps.
    let modelName = 'gemini-2.5-flash-latest';
    
    // Check for explicit image model request first
    if (model === 'image' || model === 'gemini-image') {
        modelName = 'gemini-2.5-flash-image';
    } else if (model === 'pro' || model === 'gemini-pro') {
        modelName = 'gemini-3-pro-preview';
    } else if (model === 'flash' || model === 'gemini-flash') {
        modelName = 'gemini-2.5-flash-latest';
    } else if (typeof model === 'string' && model.startsWith('gemini-')) {
        // Allow specific model overrides if they start with gemini-
        modelName = model;
    }

    // Rate Limiting (Basic IP tracking)
    try {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const realIp = ip ? ip.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
        // Increment usage count. In a real scenario, check against a limit here.
        await redis.hincrby('ai_proxy_usage', realIp, 1);
    } catch (err) {
        console.warn("Failed to track IP usage for proxy:", err);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Normalize input: accept simple 'prompt' string or full 'contents' array
    let aiContents = contents;
    if (!aiContents && prompt) {
        aiContents = prompt;
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: aiContents,
        config: config || {} // Pass through config like temperature, responseMimeType
    });

    // Extract image if present (for convenience)
    let imageUri = null;
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            // Check if inlineData exists and mimeType is defined before accessing
            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                imageUri = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break; // Return the first image found
            }
        }
    }

    // Simplify the response for the frontend app if possible, or return full object
    return res.status(200).json({ 
        text: response.text, // Convenience field (text response)
        image: imageUri,     // Convenience field (image data URI if generated)
        raw: response        // Full response if they need complex data
    });

  } catch (error) {
    console.error("Error in /api/ai-proxy:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ 
      error: "AI Proxy Error",
      details: message
    });
  }
}
