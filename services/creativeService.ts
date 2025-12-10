

import type { GeneratedCreative } from '../types.js';

export async function generateCreativePage(prompt: string): Promise<GeneratedCreative> {
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