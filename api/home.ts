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
        <li style="margin-bottom: 0.5rem;">
            <a href="/view/${item.id}" style="color: #2563eb; text-decoration: underline;">
                <strong>${item.prompt.replace(/</g, '&lt;')}</strong> 
            </a>
            <span style="color: #666; font-size: 0.9em;"> by ${item.authorName || 'Anonymous'}</span>
        </li>
    `).join('');

    const serverContent = `
        <div id="server-content" style="padding: 2rem; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <div style="margin-bottom: 2rem; text-align: center;">
                <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">MyPopku</h1>
                <p style="font-size: 1.2rem; color: #444;">An AI-native community for creating and sharing interactive content.</p>
                <div style="margin-top: 2rem;">
                   <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #000; border-top-color: #f472b6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                   <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
                </div>
            </div>
            
            <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Latest Creations</h2>
                <ul style="list-style: none; padding: 0;">${seoLinks}</ul>
            </div>
        </div>
    `;

    // 3. Construct the full HTML response
    // matches the client-side index.html structure but includes the pre-rendered data
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyPopku - Generate Interactive Concepts with AI</title>
    <link rel="icon" href="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/icon/favicon.ico">
    <meta name="description" content="An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand. Enter a topic, and get a custom-built interactive experiment.">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="MyPopku - Generate Interactive Concepts with AI">
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
    <div id="root">${serverContent}</div>
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