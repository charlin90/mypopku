import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import type { GeneratedConcept } from '../types.js';

// This function creates a full HTML document for the saved concept.
// It is nearly identical to the one in `share.ts` to ensure consistency.
async function createSavableHtml(concept: GeneratedConcept): Promise<string> {
  // Parse the initial markdown explanation to HTML
  const explanationHtml = await marked.parse(concept.explanation);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Concept Lab (Saved): ${concept.explanation.split('\n')[0].replace('##', '').trim()}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
        /* Generated CSS from AI */
        ${concept.css}
      </style>
      <style id="typography-fix">
        /* Manually adds Tailwind Typography styles for the shared/saved page */
        #explanation-panel.prose h1,
        #explanation-panel.prose h2,
        #explanation-panel.prose h3,
        #explanation-panel.prose h4 {
          color: #5eead4;
        }
        #explanation-panel.prose p {
          margin-bottom: 2rem;
        }
        #explanation-panel.prose strong {
          color: #f9fafb;
        }
        #explanation-panel.prose code {
          background-color: #111827;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
          color: #e5e7eb;
        }
      </style>
    </head>
    <body class="bg-gray-900 text-gray-100">
      <main class="fixed top-0 left-0 w-full h-full p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 box-border">
        <div class="col-span-1 lg:col-span-2 bg-gray-950 rounded-2xl relative overflow-hidden shadow-2xl border border-gray-800">
          <div id="interactive-stage" class="w-full h-full">
            ${concept.html}
          </div>
        </div>
        <div 
          id="explanation-panel"
          class="col-span-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 overflow-y-auto prose prose-invert text-2xl leading-normal text-gray-300"
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
    const conceptData: GeneratedConcept = req.body;

    // Validate incoming data
    if (!conceptData.html || !conceptData.css || !conceptData.js || !conceptData.explanation) {
      return res.status(400).json({ error: 'Incomplete concept data provided.' });
    }

    const htmlContent = await createSavableHtml(conceptData);
    const pathname = `${nanoid(12)}.html`;

    const blob = await put(pathname, htmlContent, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      token: process.env.conceptxlab_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    return res.status(200).json({ success: true, url: blob.url });

  } catch (error) {
    console.error("Error in /api/save:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: "Failed to save experiment.", details: message });
  }
}