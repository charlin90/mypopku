
import type { VercelRequest, VercelResponse } from '@vercel/node';
// FIX: Import Buffer to make it available for TypeScript.
import { Buffer } from 'buffer';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import type { GeneratedConcept, CommunityShare } from '../types.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});


// Minimal HTML template to host the shared concept
async function createShareableHtml(concept: GeneratedConcept & { prompt?: string }): Promise<string> {
  // Parse the initial markdown explanation to HTML, with a fallback.
  const explanationHtml = await marked.parse(concept.explanation || "*No explanation was provided for this concept.*");
  const hasPrompt = concept.prompt && concept.prompt.trim() !== '';

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
      ${hasPrompt ? `
        <div class="absolute top-7 left-48 flex gap-3 z-20">
            <button 
                id="show-prompt-btn"
                class="h-12 px-6 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                aria-label="Show prompt"
            >
                Prompt
            </button>
        </div>
      ` : ''}
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

      ${hasPrompt ? `
      <div id="prompt-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm items-center justify-center z-50" style="display: none;">
          <div class="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-lg flex flex-col gap-4" onclick="event.stopPropagation()">
              <h2 class="text-2xl font-bold text-white">Generation Prompt</h2>
              <div class="bg-gray-900 border border-gray-700 rounded-md p-4 text-gray-300 max-h-96 overflow-y-auto">
                  <p class="whitespace-pre-wrap">${concept.prompt?.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>
              <div class="flex justify-end gap-3 mt-4">
                  <button id="copy-prompt-btn" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 text-center">
                      Copy
                  </button>
                  <button id="close-prompt-btn" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors">
                      Close
                  </button>
              </div>
          </div>
      </div>
      ` : ''}

      <script type="module">
        document.addEventListener('DOMContentLoaded', () => {
          try {
            ${concept.js}
          } catch(e) {
            console.error("Error executing AI-generated interactive script:", e);
          }
        });
      </script>
      
      ${hasPrompt ? `
      <script type="module">
        try {
          const showPromptBtn = document.getElementById('show-prompt-btn');
          const promptModal = document.getElementById('prompt-modal');
          const closePromptBtn = document.getElementById('close-prompt-btn');
          const copyPromptBtn = document.getElementById('copy-prompt-btn');
          const promptText = \`${concept.prompt?.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\`;

          if (showPromptBtn && promptModal) {
              showPromptBtn.addEventListener('click', () => {
                  promptModal.style.display = 'flex';
              });
          }
          
          if (promptModal) {
              promptModal.addEventListener('click', (e) => {
                  if (e.target === promptModal) {
                      promptModal.style.display = 'none';
                  }
              });
          }

          if (closePromptBtn && promptModal) {
              closePromptBtn.addEventListener('click', () => {
                  promptModal.style.display = 'none';
              });
          }

          if (copyPromptBtn) {
              copyPromptBtn.addEventListener('click', () => {
                  navigator.clipboard.writeText(promptText);
                  copyPromptBtn.textContent = 'Copied!';
                  setTimeout(() => {
                      copyPromptBtn.textContent = 'Copy';
                  }, 2000);
              });
          }
        } catch(e) {
          console.error("Error setting up prompt modal:", e);
        }
      </script>
      ` : ''}
    </body>
    </html>
  `;
}

function injectPromptButtonIntoHtml(html: string, prompt: string): string {
    const sanitizedPrompt = prompt
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    const escapedJsPrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");

    const promptButtonAndModal = `
      <!-- Injected by ConceptLab -->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap');
      </style>
      <div style="position: fixed; top: 1.75rem; left: 12rem; display: flex; gap: 0.75rem; z-index: 2147483647; font-family: 'Inter', sans-serif;">
          <button 
              id="show-prompt-btn-injected"
              style="height: 3rem; padding: 0 1.5rem; background-color: rgba(31, 41, 55, 0.8); border: 1px solid #4b5563; border-radius: 9999px; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 0.875rem; font-weight: 600; cursor: pointer; backdrop-filter: blur(4px);"
          >
              Prompt
          </button>
      </div>
      <div id="prompt-modal-injected" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 2147483647; font-family: 'Inter', sans-serif;">
          <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 0.75rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 2rem; width: 90%; max-width: 36rem; display: flex; flex-direction: column; gap: 1rem;">
              <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin: 0;">Generation Prompt</h2>
              <div style="background-color: #111827; border: 1px solid #374151; border-radius: 0.375rem; padding: 1rem; color: #d1d5db; max-height: 24rem; overflow-y: auto;">
                  <p style="white-space: pre-wrap; margin: 0;">${sanitizedPrompt}</p>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                  <button id="copy-prompt-btn-injected" style="background-color: #14b8a6; color: white; font-weight: 700; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; transition: background-color 0.2s; cursor: pointer; width: 7rem; text-align: center;">
                      Copy
                  </button>
                  <button id="close-prompt-btn-injected" style="background-color: #374151; color: white; font-weight: 700; padding: 0.5rem 1.5rem; border: none; border-radius: 0.375rem; transition: background-color 0.2s; cursor: pointer;">
                      Close
                  </button>
              </div>
          </div>
      </div>
      <!-- End Injected by ConceptLab -->`;
    
    const promptScript = `
        <script type="module">
        // Injected by ConceptLab
        (function() {
            try {
                const showPromptBtn = document.getElementById('show-prompt-btn-injected');
                const promptModal = document.getElementById('prompt-modal-injected');
                const closePromptBtn = document.getElementById('close-prompt-btn-injected');
                const copyPromptBtn = document.getElementById('copy-prompt-btn-injected');
                const promptText = \`${escapedJsPrompt}\`;

                if (showPromptBtn && promptModal) {
                    showPromptBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        promptModal.style.display = 'flex';
                    });
                }
                
                if (promptModal) {
                    const modalContent = promptModal.querySelector('div');
                    promptModal.addEventListener('click', () => {
                        promptModal.style.display = 'none';
                    });
                    if (modalContent) {
                       modalContent.addEventListener('click', (e) => e.stopPropagation());
                    }
                }

                if (closePromptBtn && promptModal) {
                    closePromptBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        promptModal.style.display = 'none';
                    });
                }

                if (copyPromptBtn) {
                    copyPromptBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(promptText);
                        copyPromptBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyPromptBtn.textContent = 'Copy';
                        }, 2000);
                    });
                }
            } catch (e) {
                console.error('Error in injected ConceptLab script:', e);
            }
        })();
        </script>
    `;

    // Inject just after <body> tag
    let injectedHtml = html.replace(/<body[^>]*>/i, `$&${promptButtonAndModal}`);
    // Inject just before </body> tag
    injectedHtml = injectedHtml.replace(/<\/body>/i, `${promptScript}</body>`);
    
    return injectedHtml;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body = req.body;
    let htmlContent: string;
    const { screenshot, type, prompt } = body;

    if (!prompt || !type) {
      return res.status(400).json({ error: 'Invalid payload. Prompt and type are required.' });
    }

    // "Learn" mode sends a full `GeneratedConcept` object with html, css, js, etc.
    // "Create" mode sends a body with `html` and optionally `prompt`.
    // We differentiate based on the presence of css/js/explanation.
    if (body.html && body.css && body.js && body.explanation) {
      const conceptData: GeneratedConcept & { prompt?: string } = body;
      htmlContent = await createShareableHtml(conceptData);
    } else if (body.html && typeof body.html === 'string') {
      // This is "Create" mode
      const { html, prompt } = body;
      if (prompt) {
        htmlContent = injectPromptButtonIntoHtml(html, prompt);
      } else {
        htmlContent = html;
      }
    } else {
       return res.status(400).json({ error: 'Invalid payload. Must contain either a full concept object or an html string.' });
    }

    const htmlPathname = `${nanoid(12)}.html`;

    const htmlBlob = await put(htmlPathname, htmlContent, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      token: process.env.conceptxlab_READ_WRITE_TOKEN,
      addRandomSuffix: false, // Use the exact pathname we generated
    });
    
    let screenshotUrl = '';
    if (screenshot && typeof screenshot === 'string') {
        const imageBuffer = Buffer.from(screenshot.split(',')[1], 'base64');
        const imagePathname = `images/${nanoid(16)}.jpeg`;
        const imageBlob = await put(imagePathname, imageBuffer, {
            access: 'public',
            contentType: 'image/jpeg',
            token: process.env.conceptxlab_READ_WRITE_TOKEN,
            addRandomSuffix: false,
        });
        screenshotUrl = imageBlob.url;
    }

    // Construct the user-friendly URL for the interactive content
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.host; // Use the host from the request for reliability
    const blobUrl = `${protocol}://${host}/s/${htmlBlob.pathname}`;

    // Save metadata to Redis for the community page
    const shareData: CommunityShare = {
        id: nanoid(),
        type,
        prompt,
        screenshotUrl,
        blobUrl,
        createdAt: Date.now()
    };
    await redis.lpush('community:shares', JSON.stringify(shareData));


    return res.status(200).json({ url: blobUrl });

  } catch (error) {
    console.error("Error in /api/share:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: "Failed to create shareable link.", details: message });
  }
}
