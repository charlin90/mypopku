
import type { GeneratedConcept } from '../types.js';

export async function generateInteractiveConcept(concept: string, userId?: string): Promise<GeneratedConcept> {
  // 1. Send the user's concept to our secure backend API endpoint.
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ concept, userId }),
  });

  // 2. Check if the API call was successful.
  if (!response.ok) {
    if (response.status === 402) {
        throw new Error("Daily limit reached");
    }
    // Handle specific 503 error for model overload with a user-friendly message.
    if (response.status === 503) {
      throw new Error("The AI model is currently overloaded. We're sorry for the inconvenience. Please try again in a few moments.");
    }

    // Get the raw text of the error response to provide better debugging.
    const errorText = await response.text();
    
    // Try to parse it as our expected JSON error structure.
    try {
      const errorData = JSON.parse(errorText);
      let detailedError = errorData.error || 'Failed to generate concept.';
      if (errorData.debug) {
        // Pretty-print the debug object for better readability.
        detailedError += `\n\n--- DEBUG INFO ---\n${JSON.stringify(errorData.debug, null, 2)}`;
      }
      throw new Error(detailedError);
    } catch (e) {
      // If it's not JSON, it's likely a server crash page (e.g., from Vercel).
      // Display the raw text to make debugging the server issue easier.
      const finalError = `An unexpected server error occurred (Status: ${response.status}). The response was not valid JSON.\n\n--- RAW SERVER RESPONSE ---\n${errorText}`;
      throw new Error(finalError);
    }
  }

  // 3. Parse the successful JSON response from our backend.
  const generatedConcept: GeneratedConcept = await response.json();
  
  // 4. Basic validation on the frontend as a safeguard.
  if (
    !generatedConcept ||
    typeof generatedConcept.html !== 'string' ||
    typeof generatedConcept.css !== 'string' ||
    typeof generatedConcept.js !== 'string' ||
    typeof generatedConcept.explanation !== 'string'
  ) {
    throw new Error("The data received from the server was incomplete or malformed.");
  }

  return generatedConcept;
}
