

import type { VercelRequest, VercelResponse } from '@vercel/node';
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


async function createShareableHtml(concept: GeneratedConcept & { prompt?: string }): Promise<string> {
  const explanationHtml = await marked.parse(concept.explanation || "*No explanation was provided.*");
  const hasPrompt = concept.prompt && concept.prompt.trim() !== '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${concept.explanation.split('\n')[0].replace('##', '').trim()} - MyPopku</title>
      <link rel="icon" href="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/icon/favicon32.png">
      <!-- Google tag (gtag.js) -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-7Y6YH2EXW9"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-7Y6YH2EXW9');
      </script>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet">
      <style>
        body { 
            font-family: 'Outfit', sans-serif; 
            background-color: #fffbeb; 
            color: #111827;
        }
        /* Generated CSS from AI */
        ${concept.css}
      </style>
      <style id="base-styles">
        button {
          background-color: white;
          color: black;
          border: 2px solid black;
          padding: 10px 15px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 3px 3px 0px 0px black;
          transition: all 0.2s;
        }
        button:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0px 0px black;
        }
        button:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px 0px black;
        }
        button:disabled {
          background-color: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        select {
          background-color: white;
          color: black;
          border: 2px solid black;
          padding: 0.5rem;
          border-radius: 8px;
          font-weight: bold;
        }
        label {
          color: #374151;
          font-weight: bold;
          margin-right: 0.5rem;
        }
      </style>
      <style id="typography-fix">
        /* Custom typography for the explanation panel */
        #explanation-panel h1,
        #explanation-panel h2,
        #explanation-panel h3 {
          font-weight: 900;
          color: #000;
          margin-bottom: 1rem;
        }
        #explanation-panel p {
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        #explanation-panel strong {
          color: #000;
          background: #fef08a; /* yellow-200 */
          padding: 0 4px;
        }
        #explanation-panel code {
          background-color: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
          color: #ec4899; /* pink-500 */
          font-family: monospace;
          border: 1px solid #d1d5db;
        }
      </style>
      ${concept.libraryUrl ? `<script src="${concept.libraryUrl}"></script>` : ''}
    </head>
    <body class="bg-amber-50">
      <main class="fixed top-0 left-0 w-full h-full p-2 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 box-border">
        <div class="col-span-1 lg:col-span-2 bg-white rounded-3xl relative overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
          <div id="interactive-stage" class="w-full min-h-full flex items-center justify-center p-4 sm:p-8 box-border">
            ${concept.html}
          </div>
        </div>
        <div 
          id="explanation-panel"
          class="col-span-1 bg-white border-4 border-black rounded-3xl p-6 overflow-y-auto text-lg leading-relaxed text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          ${explanationHtml}
        </div>
      </main>

      ${hasPrompt ? `
      <div id="prompt-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm items-center justify-center z-50" style="display: none;">
          <div class="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-lg flex flex-col gap-4" onclick="event.stopPropagation()">
              <h2 class="text-2xl font-black text-black">Generation Prompt</h2>
              <div class="bg-gray-50 border-2 border-black rounded-xl p-4 text-gray-800 max-h-96 overflow-y-auto font-mono text-sm">
                  <p class="whitespace-pre-wrap">${concept.prompt?.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>
              <div class="flex justify-end gap-3 mt-4">
                  <button id="copy-prompt-btn" class="bg-teal-300 hover:bg-teal-400 border-2 border-black text-black font-bold py-2 px-4 rounded-xl shadow-[3px_3px_0px_0px_black] transition-all w-28">
                      Copy
                  </button>
                  <button id="close-prompt-btn" class="bg-gray-200 hover:bg-gray-300 border-2 border-black text-black font-bold py-2 px-6 rounded-xl">
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
    const gaScript = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-7Y6YH2EXW9"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-7Y6YH2EXW9');
</script>`;

    const sanitizedPrompt = prompt
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    const escapedJsPrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");

    const promptButtonAndModal = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap');
      </style>
      <div id="prompt-modal-injected" style="position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 2147483647; font-family: 'Outfit', sans-serif;">
          <div style="background-color: white; border: 4px solid black; border-radius: 1rem; box-shadow: 10px 10px 0px 0px rgba(0,0,0,1); padding: 2rem; width: 90%; max-width: 36rem; display: flex; flex-direction: column; gap: 1rem;">
              <h2 style="font-size: 1.5rem; font-weight: 900; color: black; margin: 0;">Generation Prompt</h2>
              <div style="background-color: #f9fafb; border: 2px solid black; border-radius: 0.75rem; padding: 1rem; color: #1f2937; max-height: 24rem; overflow-y: auto;">
                  <p style="white-space: pre-wrap; margin: 0;">${sanitizedPrompt}</p>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                  <button id="copy-prompt-btn-injected" style="background-color: #86efac; color: black; font-weight: 700; padding: 0.5rem 1rem; border: 2px solid black; border-radius: 0.5rem; transition: background-color 0.2s; cursor: pointer; width: 7rem; text-align: center; box-shadow: 3px 3px 0px black;">
                      Copy
                  </button>
                  <button id="close-prompt-btn-injected" style="background-color: #e5e7eb; color: black; font-weight: 700; padding: 0.5rem 1.5rem; border: 2px solid black; border-radius: 0.5rem; transition: background-color 0.2s; cursor: pointer;">
                      Close
                  </button>
              </div>
          </div>
      </div>
      `;
    
    const promptScript = `
        <script type="module">
        (function() {
            try {
                const promptModal = document.getElementById('prompt-modal-injected');
                const closePromptBtn = document.getElementById('close-prompt-btn-injected');
                const copyPromptBtn = document.getElementById('copy-prompt-btn-injected');
                const promptText = \`${escapedJsPrompt}\`;
                
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
                console.error('Error in injected Popku script:', e);
            }
        })();
        </script>
    `;
    
    let injectedHtml = html;
    
    // Inject GA into head if possible
    if (injectedHtml.includes('<head>')) {
        injectedHtml = injectedHtml.replace('<head>', `<head>\n${gaScript}`);
    } else {
        // Fallback: just prepend
        injectedHtml = `${gaScript}\n${injectedHtml}`;
    }

    injectedHtml = injectedHtml.replace(/<body[^>]*>/i, `$&${promptButtonAndModal}`);
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
    const { screenshot, type, prompt, userId, authorName, authorAvatarUrl, title, description, keywords } = body;

    if (!prompt || !type) {
      return res.status(400).json({ error: 'Invalid payload.' });
    }

    if (body.html && body.css && body.js && body.explanation) {
      const conceptData: GeneratedConcept & { prompt?: string } = body;
      htmlContent = await createShareableHtml(conceptData);
    } else if (body.html && typeof body.html === 'string') {
      const { html, prompt } = body;
      if (prompt) {
        htmlContent = injectPromptButtonIntoHtml(html, prompt);
      } else {
        htmlContent = html;
      }
    } else {
       return res.status(400).json({ error: 'Invalid payload.' });
    }

    const htmlPathname = `${nanoid(12)}.html`;

    const htmlBlob = await put(htmlPathname, htmlContent, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      token: process.env.conceptxlab_READ_WRITE_TOKEN,
      addRandomSuffix: false,
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

    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = req.headers.host;
    
    // Generate a permanent ID for this share
    const id = nanoid();
    
    // Legacy Blob URL (internal use)
    const blobUrl = `${protocol}://${host}/s/${htmlBlob.pathname}`;
    
    // SEO-friendly URL (public sharing)
    const viewUrl = `${protocol}://${host}/view/${id}`;

    const shareData: CommunityShare = {
        id,
        type,
        prompt,
        title: title || undefined,
        description: description || undefined,
        keywords: keywords || undefined,
        screenshotUrl,
        blobUrl,
        createdAt: Date.now(),
        userId: userId || undefined,
        authorName,
        authorAvatarUrl,
    };
    
    // 1. Add to the feed list
    await redis.lpush('community:shares', JSON.stringify(shareData));
    
    // 2. Add to key-value store using Hash to avoid cluttering keys
    await redis.hset('shares', { [id]: shareData });

    // 3. If user is logged in, add to their personal list stored in a single Hash
    if (userId) {
        // Use a single hash 'user_creations' mapping userId -> [id1, id2...]
        const userShares = await redis.hget<string[]>('user_creations', userId) || [];
        userShares.unshift(id);
        await redis.hset('user_creations', { [userId]: userShares });
    }

    // Return the SEO-friendly URL to the user
    return res.status(200).json({ url: viewUrl });

  } catch (error) {
    console.error("Error in /api/share:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: "Failed to create shareable link.", details: message });
  }
}