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
    You are an expert frontend developer and creative science communicator with a world-class eye for UI/UX design.
    Your task is to create a simple, elegant, and interactive learning module for the concept: "${concept}".
    The module follows a "Guided Discovery" philosophy: the user learns by doing, and every action is explained in real-time.
    Generate a JSON object that strictly adheres to the provided schema.

    ---
    **Guidelines: Read and obey these rules without exception.**
    ---

    **1. HTML: Semantic & Interactive Foundation**
    *   Create semantic and minimal HTML for the visualization. The root elements will be injected into a container div '#interactive-stage'.
    *   **CRITICAL BINDING RULE:** Every single interactive element (button, slider, input, etc.) MUST have a simple, unique \`id\` attribute. This is non-negotiable for the JavaScript to function.
    *   You MUST group all user controls (buttons, sliders, inputs) inside a single container element, like \`<div id="controls-panel">\`.
    *   You MUST include a reset button with \`id="reset-btn"\` and the visible text "Reset" to allow the user to restart the experiment.

    **2. CSS: Mobile-First, Responsive, & Elegant Design**
    *   **CRITICAL LAYOUT RULES:**
        *   **Main Container:** Your root HTML element MUST act as a full-height flex column to position content. Style it with: \`display: flex; flex-direction: column; justify-content: space-between; align-items: center; height: 100%; width: 100%; box-sizing: border-box; padding: 2rem;\`. This pushes your visualization area towards the top and the controls panel to the bottom.
        *   **Controls Panel (Mobile):** The \`#controls-panel\` container MUST stack controls vertically by default for mobile. Use \`display: flex; flex-direction: column; gap: 1rem; align-items: center;\`.
        *   **Controls Panel (Desktop):** Inside a \`@media (min-width: 768px)\` media query, you MUST change the controls panel to \`flex-direction: row;\` to lay out controls horizontally.
    *   **SCROLLING BEHAVIOR:** The container for your HTML (\`#interactive-stage\`) allows vertical scrolling (\`overflow-y: auto\`). It is acceptable for your mobile layout to be taller than the viewport. Prioritize clear, tappable controls over cramming everything onto one screen.
    *   You MUST use a sophisticated dark theme (e.g., background #111827).
    *   The final product MUST be visually stunning, modern, and clean. Use high-contrast foreground elements, a single vibrant accent color (e.g., teal), and smooth animations.
    *   Ensure font sizes and tap targets are large enough for mobile usability.
    *   The reset button should be styled consistently with other controls and grouped logically with them (e.g., in a controls panel), not isolated in a corner.
    *   Ensure your CSS rules do not place any elements on top of interactive elements, making them unclickable. Check \`z-index\` and \`position\`.

    **3. JavaScript: Flawless, Real-time Interactivity**
    *   Your JS should function flawlessly on both mobile and desktop. Event listeners (e.g., 'click') work universally. Be mindful of hover effects which are not available on touch devices.
    *   **THE GOLDEN RULE:** Every user action must produce an immediate, obvious, and informative reaction.
    *   **Query & Guard:** For EACH \`id\` you created in the HTML, you MUST have a corresponding \`document.querySelector('#your-id')\`. This query MUST be immediately followed by a null-check guard (\`if (element) { ... }\`) before attaching an event listener.
    *   **Visual Feedback:** Inside EVERY event listener, you MUST cause an immediate visual change within '#interactive-stage'. An element must appear, move, change color, etc.
    *   **Explanation Update:** After the visual change, you MUST update the \`innerHTML\` of '#explanation-panel' to describe what just happened and what it means for the concept. Use short, clear paragraphs and \`<strong>\` tags.
    *   **Reset Functionality:** You MUST implement the logic for the reset button. The event listener for '#reset-btn' must restore the entire experiment to its original, initial state. This includes resetting all visual elements, re-enabling any disabled controls, and critically, resetting the '#explanation-panel' innerHTML back to the original explanation provided in the JSON.
    *   **Robustness:** Interactive elements MUST be enabled by default in the HTML. Only disable them via JS after an action makes them redundant. The JS code can assume that any library specified in \`libraryUrl\` has been loaded before it runs. If you don't provide a library, the code must be self-contained vanilla JavaScript.

    **4. Explanation: Clear & Scannable Initial State**
    *   The 'explanation' field in the JSON is for the *initial state* of the explanation panel.
    *   It must be a brief introduction to the concept that prompts the user to perform their first interaction.
    *   **CRUCIAL FORMATTING:** AVOID long paragraphs or "walls of text." Use headings, bullet points, and bold text to make it easy to scan and understand in seconds.

    **5. External Libraries (Optional)**
    *   If the concept is best demonstrated with a popular, well-known library (e.g., D3.js for data visualization, Three.js for 3D), you may provide a single, reputable CDN URL in the \`libraryUrl\` field. DO NOT use this for trivial cases. Only when the library is core to the concept's visualization.

    ---
    **FINAL CHECK: Before generating the JSON, perform this mental code review.**
    ---

    1.  **HTML-JS Link:** Does every \`id\` in my HTML have a corresponding, guarded \`querySelector\` and event listener in my JS?
    2.  **JS-CSS Link:** Does every class I add in JS have a visible effect defined in my CSS?
    3.  **User Flow:** If a user clicks the first button, will they see something change AND see the explanation update? Is the flow logical?
    4.  **Responsiveness:** Does the layout stack and rearrange correctly on a narrow viewport? Is it legible and usable on a phone? Are my controls at the bottom?
    5.  **Aesthetics:** Does this look modern, clean, and elegant? Is it perfectly centered? Is it consistent with a dark theme?
    6.  **Explanation:** Is my initial explanation short, scannable, and does it guide the user to their first action?
    7.  **Reset:** Does the reset button correctly return the experiment to its exact starting state, including visuals and the explanation text?
    8.  **Library:** If I used \`libraryUrl\`, is the URL correct and is my JS code written to use that library?

    Now, generate the raw JSON object for the concept: "${concept}".
    Your entire response must be ONLY the JSON object, starting with { and ending with }. Do not wrap it in markdown fences (e.g., \`\`\`json) or add any other text before or after the object.
  `;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Check for API Key at the start of the handler.
  // This prevents a module-level crash if the env var is missing.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    return res.status(500).json({
      error: "Server configuration error.",
      debug: {
        message: "The API_KEY environment variable is not set on the server. This is a required configuration for the application to function."
      }
    });
  }

  // Initialize the AI client inside the handler, now that we know the key exists.
  const ai = new GoogleGenAI({ apiKey });
  
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
    // Log the raw text from the AI for debugging purposes.
    console.log("AI Raw Response Text:", responseText);

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
    
    // Create a detailed debug object
    const debugInfo: any = {
      message: message,
    };
    if (error instanceof Error) {
        debugInfo.name = error.name;
        debugInfo.stack = error.stack;
    }
    
    return res.status(500).json({ 
      error: "An error occurred on the server during content generation.",
      debug: debugInfo
    });
  }
}