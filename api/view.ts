
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  let title = 'Popku';
  let description = 'An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand.';
  let imageUrl = 'https://popku.com/og-image.png'; // Default or placeholder

  if (id && typeof id === 'string') {
    try {
        // Fetch from Hash 'shares'
        // Upstash hget automatically parses JSON if it was stored as such, so we type it
        const item = await redis.hget<CommunityShare>('shares', id);
        
        if (item) {
            title = `${item.prompt} - Popku`;
            description = `Check out this interactive interactive concept generated on Popku: ${item.prompt}`;
            if (item.screenshotUrl) {
                imageUrl = item.screenshotUrl;
            }
        }
    } catch (e) {
        console.error("Failed to fetch item for SEO:", e);
    }
  }

  // We serve the index.html content manually here, injecting the SEO tags.
  // We MUST ensure the script src is absolute (/index.js).
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="Popku">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${imageUrl}">

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', sans-serif;
            background-color: #ffffff; /* White background */
            background-image: radial-gradient(#e5e7eb 2px, transparent 2px);
            background-size: 24px 24px;
            color: #111827;
        }
        
        /* Custom Scrollbar for a fun look */
        ::-webkit-scrollbar {
            width: 12px;
        }
        ::-webkit-scrollbar-track {
            background: #fff;
            border-left: 2px solid #000;
        }
        ::-webkit-scrollbar-thumb {
            background: #fbbf24; /* amber-400 */
            border: 2px solid #000;
            border-radius: 6px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #f59e0b;
        }
    </style>
    <script defer src="/_vercel/insights/script.js"></script>
<script type="importmap">
{
  "imports": {
    "react": "https://aistudiocdn.com/react@^18.3.1",
    "react-dom/": "https://aistudiocdn.com/react-dom@^18.3.1/",
    "react/": "https://aistudiocdn.com/react@^18.3.1/",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.27.0",
    "@vercel/analytics": "https://aistudiocdn.com/@vercel/analytics@^1.3.1",
    "marked": "https://aistudiocdn.com/marked@^16.4.1",
    "@vercel/node": "https://aistudiocdn.com/@vercel/node@^5.5.1",
    "nanoid": "https://aistudiocdn.com/nanoid@^5.1.6",
    "@vercel/blob": "https://aistudiocdn.com/@vercel/blob@^2.0.0",
    "@upstash/redis": "https://aistudiocdn.com/@upstash/redis@^1.35.6",
    "html2canvas": "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js",
    "buffer": "https://aistudiocdn.com/buffer@^6.0.3"
  }
}
</script>
</head>
<body class="selection:bg-pink-300 selection:text-black">
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache for 1 minute (SWR) to balance SEO freshness with performance
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
  
  return res.status(200).send(html);
}
