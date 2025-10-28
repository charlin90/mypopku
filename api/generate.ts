import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedConcept } from '../types.js';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  // This will cause the function to fail gracefully if the API key is not set
  throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey });

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
  },
  required: ["html", "css", "js", "explanation"],
};

function getPrompt(concept: string): string {
    return `
    You are an expert frontend developer and creative science communicator.
    Your task is to create a simple, elegant, and interactive learning module for the concept: "${concept}".
    The module must follow a strict "Guided Discovery" philosophy: the user learns by doing, and every action is explained in real-time.
    Generate a JSON object that strictly adheres to the provided schema.

    **The Non-Negotiable Interactivity Mandate (CRITICAL - READ AND OBEY):**

    THE GOLDEN RULE: A USER ACTION THAT DOES NOT PRODUCE AN IMMEDIATE AND OBVIOUS VISUAL CHANGE IS A COMPLETE FAILURE. THERE ARE NO EXCEPTIONS.

    To ensure this, you MUST follow this protocol without deviation:

    1.  **MANDATORY VISUAL FEEDBACK PROTOCOL (TOP PRIORITY):**
        *   **EVERY ACTION MUST HAVE A VISIBLE REACTION:** Every single event listener (click, input, etc.) MUST cause an immediate and obvious visual change within '#interactive-stage'. An element MUST appear, move, change color, animate, or be added/removed. A state change that the user cannot see is a failed interaction.
        *   **GUARANTEED CSS SYNCHRONIZATION:** If your JavaScript adds a CSS class to an element (e.g., \`element.classList.add('active')\`), you MUST verify that a corresponding, working CSS rule for that class exists in your CSS output. A class that does nothing is a bug.
        *   **THE EXPLANATION PANEL AS PROOF:** The innerHTML of '#explanation-panel' MUST be updated on every single user interaction to describe what just happened. This is a non-negotiable form of feedback.

    2.  **A/B MATCHING PROTOCOL:**
        *   **PART A (HTML):** For every interactive element, you MUST assign a simple, unique \`id\`. EXAMPLE: \`<button id="action-button">Click Me</button>\`.
        *   **PART B (JAVASCRIPT):** In your JavaScript, you MUST use \`document.querySelector\` with the EXACT SAME ID STRING. You MUST perform a null check immediately after. EXAMPLE:
            \`const button = document.querySelector('#action-button');\`
            \`if (button) { /* ... add event listener ... */ }\`
        *   **VERIFICATION:** Before outputting, double-check: Does the string in \`querySelector()\` in your JS *perfectly* match the \`id\` in your HTML?

    3.  **NO OBSCURING ELEMENTS (CSS):** Your CSS MUST NOT place any other element on top of your interactive elements. Buttons and sliders must be fully exposed and clickable.

    4.  **NO 'DISABLED' BY DEFAULT (HTML):** Interactive elements MUST be clickable from the start. DO NOT use the \`disabled\` attribute in the initial HTML.

    **Explanation Content Style (Strict Requirement):**
    - **Clarity and Scannability:** Use very short paragraphs (1-2 sentences max). Use HTML tags like \`<strong>\` and \`<ul>\` to make text digestible.

    **Execution Context (Reminder):**
    - Your JavaScript code runs AFTER the HTML is in the DOM.
    - You DO NOT need \`DOMContentLoaded\`. You SHOULD query for elements immediately.
    - Your code MUST ONLY manipulate '#interactive-stage' and '#explanation-panel'.

    **Final Mandate:**
    Review the **Non-Negotiable Interactivity Mandate** one last time, especially the **Visual Feedback Protocol**. If there is any doubt that the interaction will work flawlessly and provide immediate visual feedback, start over and simplify until it is perfect.

    Generate the JSON for the concept: "${concept}".
  `;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { concept } = req.body;

  if (!concept || typeof concept !== 'string' || concept.trim() === '') {
    return res.status(400).json({ error: 'Concept is required and must be a non-empty string.' });
  }

  try {
    const prompt = getPrompt(concept);
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7,
        },
    });

    if (!response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        let errorMessage = "The AI returned an empty response. This might be a temporary issue. Please try again.";
        if (finishReason === 'SAFETY') {
          errorMessage = "The request was blocked for safety reasons. Please try a different, more general concept.";
        } else if (finishReason === 'RECITATION') {
           errorMessage = "The response was blocked to prevent plagiarism. Please try a different concept.";
        }
        throw new Error(errorMessage);
    }
    
    // Robust parsing: clean potential markdown fences before parsing JSON.
    let responseText = response.text.trim();
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = responseText.match(jsonRegex);

    if (match && match[1]) {
      responseText = match[1];
    }
    
    const parsedObject = JSON.parse(responseText);

    if (
        parsedObject &&
        typeof parsedObject.html === 'string' &&
        typeof parsedObject.css === 'string' &&
        typeof parsedObject.js === 'string' &&
        typeof parsedObject.explanation === 'string'
    ) {
        return res.status(200).json(parsedObject as GeneratedConcept);
    } else {
        throw new Error("AI response did not match the expected structure.");
    }

  } catch (error) {
    console.error("Error in /api/generate:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: message });
  }
}
