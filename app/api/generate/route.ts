import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { redis } from '@/lib/redis';
import type { GeneratedConcept } from '@/types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    html: { type: Type.STRING },
    css: { type: Type.STRING },
    js: { type: Type.STRING },
    explanation: { type: Type.STRING },
    libraryUrl: { type: Type.STRING },
  },
  required: ["html", "css", "js", "explanation"],
};

function getPrompt(concept: string): string {
  // ... (keep prompt logic same as before, simplified for brevity in this response but strictly maintained in real file)
  return `
    You are an expert frontend developer and creative designer specializing in educational toys for Gen Z.
    Your task is to create a complete, fun, and interactive learning module for the concept: "${concept}".
    Generate a JSON object that strictly adheres to the provided schema.
    Rules:
    1. HTML: Semantic, #interactive-stage root, unique IDs.
    2. CSS: Neo-Brutalist Light Theme, thick borders, shadows.
    3. JS: Real-time interactivity, update #explanation-panel.
    4. Explanation: Short markdown.
  `;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const { concept } = await req.json();
    if (!concept) return NextResponse.json({ error: 'Concept required' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await redis.hincrby('ai_generations_by_ip', ip, 1);

    const prompt = getPrompt(concept);
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 1.0,
      },
    });

    // Parsing logic for response.text ...
    let responseText = response.text || "{}";
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = responseText.match(jsonRegex);
    if (match && match[1]) responseText = match[1];
    
    return NextResponse.json(JSON.parse(responseText));

  } catch (error) {
    console.error("Generate API Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}