
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import type { GeneratedConcept } from '../types.js';

// Minimal HTML template to host the shared concept
async function createShareableHtml(concept: GeneratedConcept): Promise<string> {
  // Parse the initial markdown explanation to HTML
  const explanationHtml = await marked.parse(concept.explanation);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Concept Lab: ${concept.explanation.split('\n')[0].replace('##', '').trim()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
        /* Generated CSS from AI */
        ${concept.css}
      </style>
      <style id="base-styles">
        /* 
          This block provides fallback styles for common interactive elements
          to ensure they look good in the standalone shared file, mimicking
          the main app's aesthetic.
        */
        button {
          background-color: #2d3748;
          color: white;
          border: 1px solid #4a5568;
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease-in-out;
        }
        button:hover {
          background-color: #4a5568;
        }
        button:disabled {
          background-color: #1a202c;
          color: #718096;
          cursor: not-allowed;
        }
        select {
          background-color: #2d3748;
          color: white;
          border: 1px solid #4a5568;
          padding: 0.5rem;
          border-radius: 4px;
        }
        label {
          color: #a0aec0;
          margin-right: 0.5rem;
        }
      </style>
      <style id="typography-fix">
        /* 
          This block manually adds the necessary styles from the Tailwind Typography plugin 
          because they are not included in the default Tailwind CDN script. This ensures 
          the explanation panel in the shared link has the correct styling.
        */
        #explanation-panel.prose h1,
        #explanation-panel.prose h2,
        #explanation-panel.prose h3,
        #explanation-panel.prose h4 {
          color: #5eead4; /* Equivalent to text-teal-300 */
        }
        #explanation-panel.prose p {
          margin-bottom: 2rem; /* Approximates [&>p]:mb-8 with a base font size */
        }
        #explanation-panel.prose strong {
          color: #f9fafb; /* Equivalent to prose-strong:text-gray-100 */
        }
        #explanation-panel.prose code {
          background-color: #111827; /* Equivalent to prose-code:bg-gray-900 */
          padding: 0.25rem 0.5rem; /* Equivalent to prose-code:px-2 prose-code:py-1 */
          border-radius: 0.375rem; /* Equivalent to prose-code:rounded-md */
          font-weight: 600;
          color: #e5e7eb; /* A readable code color */
        }
      </style>
      ${concept.libraryUrl ? `<script src="${concept.libraryUrl}"></script>` : ''}
    </head>
    <body class="bg-gray-900 text-gray-100">
      <main class="fixed top-0 left-0 w-full h-full p-2 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 box-border">
        <div class="col-span-1 lg:col-span-2 bg-gray-950 rounded-2xl relative overflow-y-auto shadow-2xl border border-gray-800">
          <div id="interactive-stage" class="w-full min-h-full flex items-center justify-center p-4 sm:p-8 box-border">
            ${concept.html}
          </div>
        </div>
        <div 
          id="explanation-panel"
          class="col-span-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-8 overflow-y-auto prose prose-invert text-2xl leading-normal text-gray-300"
        >
          ${explanationHtml}
        </div>
      </main>
      <script type="module">
        ${concept.js}
      </script>
    </body>
    </html>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body = req.body;
    let htmlContent: string;

    // "Create" mode sends a body with just a full `html` document string.
    // "Learn" mode sends a full `GeneratedConcept` object with html, css, js, etc.
    // We differentiate based on the presence of other fields.
    if (body.html && !body.css && !body.explanation && typeof body.html === 'string') {
      htmlContent = body.html;
    } else {
      const conceptData: GeneratedConcept = body;

      // Validate incoming data for 'learn' mode
      if (!conceptData.html || !conceptData.css || !conceptData.js || !conceptData.explanation) {
        return res.status(400).json({ error: 'Incomplete concept data provided for learn mode.' });
      }
      htmlContent = await createShareableHtml(conceptData);
    }

    const pathname = `${nanoid(12)}.html`;

    const blob = await put(pathname, htmlContent, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      token: process.env.conceptxlab_READ_WRITE_TOKEN,
      addRandomSuffix: false, // Use the exact pathname we generated
    });

    // Construct the user-friendly URL
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.host; // Use the host from the request for reliability
    const shareUrl = `${protocol}://${host}/s/${blob.pathname}`;

    return res.status(200).json({ url: shareUrl });

  } catch (error) {
    console.error("Error in /api/share:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: "Failed to create shareable link.", details: message });
  }
}
