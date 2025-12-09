
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Fetch latest community shares for SEO (Server-Side)
    // We fetch a reasonable batch (e.g., 50) to give crawlers plenty of paths
    const sharesRaw = await redis.lrange('community:shares', 0, 49);
    const shares = sharesRaw as unknown as CommunityShare[];
    
    // 2. Build the SEO Content (Hidden from users, visible to bots via <noscript>)
    // This provides the internal linking structure search engines need.
    const seoLinks = shares.map(item => `
        <li>
            <a href="/view/${item.id}">
                <strong>${item.prompt.replace(/</g, '&lt;')}</strong> 
                by ${item.authorName || 'Anonymous'}
            </a>
            <p>Interactive ${item.type} app generated with AI.</p>
        </li>
    `).join('');

    const seoContent = `
      <noscript>
        <div id="seo-content">
            <h1>Popku - Interactive AI Concept Generator</h1>
            <p>Create live, hands-on simulations for any concept you want to understand. 
               Browse our community gallery of AI-generated interactive apps, games, and educational tools.</p>
            <h2>Latest Community Creations</h2>
            <ul>${seoLinks}</ul>
        </div>
      </noscript>
    `;

    // 3. Construct the full HTML response
    // matches the client-side index.html structure but includes the pre-rendered data
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Popku - Generate Interactive Concepts with AI</title>
    <meta name="description" content="An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand. Enter a topic, and get a custom-built interactive experiment.">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Popku - Generate Interactive Concepts with AI">
    <meta property="og:description" content="An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand.">
    <meta property="og:image" content="https://popku.com/og-image.png">
    
    <!-- Canonical -->
    <link rel="canonical" href="https://${req.headers.host || 'popku.com'}/">

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-7Y6YH2EXW9"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-7Y6YH2EXW9');
    </script>
    <link href="/output.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', sans-serif;
            background-color: #ffffff;
            background-image: radial-gradient(#e5e7eb 2px, transparent 2px);
            background-size: 24px 24px;
            color: #111827;
        }
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: #fff; border-left: 2px solid #000; }
        ::-webkit-scrollbar-thumb { background: #fbbf24; border: 2px solid #000; border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
    </style>
    <script defer src="/_vercel/insights/script.js"></script>
<script type="importmap">
{
  "imports": {
    "react": "https://aistudiocdn.com/react@^18.3.1",
    "react-dom": "https://aistudiocdn.com/react-dom@^18.3.1",
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
    "buffer": "https://aistudiocdn.com/buffer@^6.0.3",
    "@clerk/clerk-react": "https://esm.sh/@clerk/clerk-react@5.15.0?external=react,react-dom"
  }
}
</script>
</head>
<body class="selection:bg-pink-300 selection:text-black">
    <div id="root"></div>
    ${seoContent}
    <script type="module" src="/index.js"></script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache the homepage for 1 minute (SWR)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering homepage:', error);
    // Fallback to basic HTML if Redis fails
    return res.status(500).send('Error loading page');
  }
}
