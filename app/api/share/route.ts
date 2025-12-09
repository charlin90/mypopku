import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import { redis } from '@/lib/redis';
import type { GeneratedConcept, CommunityShare } from '@/types';
import { Buffer } from 'buffer';

async function createShareableHtml(concept: GeneratedConcept & { prompt?: string }): Promise<string> {
  const explanationHtml = await marked.parse(concept.explanation || "");
  // Replaced Tailwind CDN with basic CSS variables and styles for portability and performance in generated files
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${concept.prompt} - Popku</title>
  <style>
    :root {
      --bg: #fffbeb;
      --text: #111827;
      --border: #000;
      --shadow: 4px 4px 0px 0px #000;
    }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
    #root { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; max-width: 1200px; margin: 0 auto; height: 90vh; }
    @media(max-width: 768px) { #root { grid-template-columns: 1fr; height: auto; } }
    
    /* Neo-Brutalist Base Styles replacing Tailwind */
    .panel { background: #fff; border: 4px solid var(--border); border-radius: 16px; box-shadow: 8px 8px 0px 0px #000; overflow: hidden; display: flex; flex-direction: column; }
    #interactive-stage { padding: 20px; flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
    #explanation-panel { padding: 20px; overflow-y: auto; }
    
    /* User Generated CSS */
    ${concept.css}
  </style>
  ${concept.libraryUrl ? `<script src="${concept.libraryUrl}"></script>` : ''}
</head>
<body>
  <div id="root">
    <div class="panel">
      <div id="interactive-stage">${concept.html}</div>
    </div>
    <div id="explanation-panel" class="panel">
      ${explanationHtml}
    </div>
  </div>
  <script type="module">
     ${concept.js}
  </script>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, userId, authorName, authorAvatarUrl, screenshot } = body;
    
    if (!prompt || !type) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    let htmlContent = "";
    if (body.html && body.css) {
       htmlContent = await createShareableHtml(body);
    } else {
       htmlContent = body.html; // simplified fallback
    }

    const htmlBlob = await put(`${nanoid(12)}.html`, htmlContent, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      token: process.env.conceptxlab_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    // Upload screenshot if exists
    let screenshotUrl = "";
    if (screenshot && screenshot.startsWith('data:')) {
         const buffer = Buffer.from(screenshot.split(',')[1], 'base64');
         const imgBlob = await put(`images/${nanoid(16)}.jpeg`, buffer, {
            access: 'public',
            contentType: 'image/jpeg',
            token: process.env.conceptxlab_READ_WRITE_TOKEN,
            addRandomSuffix: false,
         });
         screenshotUrl = imgBlob.url;
    }

    const id = nanoid();
    // Use the request URL to determine host for absolute URLs
    const url = new URL(req.url);
    const viewUrl = `${url.protocol}//${url.host}/view/${id}`;

    const shareData: CommunityShare = {
        id, type, prompt, screenshotUrl,
        blobUrl: htmlBlob.url, // Point directly to blob or proxied URL
        createdAt: Date.now(),
        userId, authorName, authorAvatarUrl
    };

    await redis.lpush('community:shares', JSON.stringify(shareData));
    await redis.hset('shares', { [id]: shareData });
    if (userId) {
        const userShares = await redis.hget<string[]>('user_creations', userId) || [];
        userShares.unshift(id);
        await redis.hset('user_creations', { [userId]: userShares });
    }

    return NextResponse.json({ url: viewUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Share failed' }, { status: 500 });
  }
}