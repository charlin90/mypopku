import type { GeneratedConcept } from '../types.js';

export async function generateInteractiveConcept(concept: string): Promise<GeneratedConcept> {
  // 1. Send the user's concept to our secure backend API endpoint.
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ concept }),
  });

  // 2. Check if the API call was successful.
  if (!response.ok) {
    // If the server returned an error, parse the error message from the response body.
    const errorData = await response.json().catch(() => ({
      // Fallback if the response body isn't valid JSON
      error: `An unexpected server error occurred (Status: ${response.status}).`,
    }));
    
    // Construct a more detailed error message for debugging
    let detailedError = errorData.error || 'Failed to generate concept.';
    if (errorData.debug) {
      // Pretty-print the debug object for better readability.
      detailedError += `\n\n--- DEBUG INFO ---\n${JSON.stringify(errorData.debug, null, 2)}`;
    }

    // Throw an error with the detailed message.
    throw new Error(detailedError);
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