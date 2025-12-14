
import type { GeneratedCreative } from '../types.js';

export async function generateCreativePage(prompt: string): Promise<GeneratedCreative> {
  // 1. Technical Consultant Check
  // We first send the prompt to the consultant to see if it's feasible within our technical constraints.
  const consultResponse = await fetch('/api/consultant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!consultResponse.ok) {
     const errorText = await consultResponse.text();
     console.error("Consultant check failed:", errorText);
     // If the consultant API itself fails, we might choose to proceed or fail.
     // For safety and better UX, we'll block and inform the user.
     throw new Error("Unable to analyze request feasibility. Please try again.");
  }

  const consultResult = await consultResponse.json();

  if (consultResult.status === 'NEGOTIATE') {
      // The consultant has determined the request is not fully feasible.
      // We throw an error with the consultant's specific reply to inform the user.
      throw new Error(`Technical Consultant: ${consultResult.reply}`);
  }

  // 2. Generate Application
  // If status is PASS, we proceed to the generation phase.
  const response = await fetch('/api/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    try {
      // Try to parse a JSON error response from the API
      const errorData = await response.json();
      const errorMessage = errorData.error || 'Failed to generate creative page.';
      // We'll throw the server-provided message, which is more specific.
      throw new Error(errorMessage);
    } catch (e) {
      // If parsing fails, it's likely a different kind of server error (e.g., HTML error page).
      // Fallback to the raw response text.
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }
  }

  // The API is expected to return a JSON object like { html, title, description, keywords }
  const result = await response.json();
  if (typeof result.html !== 'string') {
    throw new Error("The server response did not contain the expected HTML content.");
  }

  return result as GeneratedCreative;
}
