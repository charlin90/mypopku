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
                <strong>${item.prompt.replace(/</g, '&lt;')}</strong> - AI Generated Mini App
            </a>
            <span style="color: #666; font-size: 0.9em;"> by ${item.authorName || 'Anonymous'}</span>
        </li>
    `).join('');

    const serverContent = `
        <div id="server-content" style="padding: 2rem; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <div style="margin-bottom: 2rem; text-align: center;">
                <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">MyPopku - AI Mini App Generator</h1>
                <p style="font-size: 1.25rem; color: #444; line-height: 1.6;">
                    An AI-native community for <strong>Natural Language Programming</strong>. 
                    Create, play, and share interactive <strong>Mini Apps</strong>, <strong>Games</strong>, <strong>Tools</strong>, and <strong>Simulations</strong> with a single sentence (Prompt-to-App).
                </p>
                <p style="font-size: 1rem; color: #666; margin-top: 0.5rem;">
                   Experience the infinite potential of <strong>Generative UI</strong>. The best free alternative to <strong>Websim</strong> and <strong>Wabi</strong>.
                </p>
                <div style="margin-top: 2rem;">
                   <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #000; border-top-color: #f472b6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                   <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
                </div>
            </div>
            
            <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Latest Community Creations</h2>
                <ul style="list-style: none; padding: 0;">${seoLinks}</ul>
            </div>
            
             <div style="margin-top: 3rem; font-size: 0.9rem; color: #888;">
                <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Popular Searches</h3>
                <p>AI Game Generator, No-code Tools, Prompt-to-App, Interactive Learning, Generative UI Examples, Websim Alternative, Wabi Alternative, HTML5 Generator.</p>
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
    <title>MyPopku - AI Mini App Generator | Create Games, Tools & Interactive Content</title>
    <link rel="icon" href="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/icon/favicon32.png">
    
    <meta name="description" content="MyPopku is an AI-native community for natural language programming. Generate interactive mini-apps, HTML5 games, tools, and simulations with a single prompt. Experience the potential of Generative UI. The best free alternative to Websim and Wabi.">
    <meta name="keywords" content="AI App Generator, Natural Language Programming, Generative UI, Websim Alternative, Wabi Alternative, AI Game Maker, No-code Tool, Interactive Learning, Prompt-to-App, MyPopku, 一句话生成App, 自然语言编程, 互动内容社区, HTML5生成工具">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="MyPopku - AI Mini App Generator | Create Games & Tools">
    <meta property="og:description" content="Create interactive mini-apps, games, and tools instantly with AI. No code required. The best alternative to Websim and Wabi.">
    <meta property="og:image" content="https://popku.com/og-image.png">
    <meta property="og:site_name" content="MyPopku">
    
    <!-- Canonical -->
    <link rel="canonical" href="https://${req.headers.host || 'popku.com'}/">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "MyPopku",
        "url": "https://popku.com",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://popku.com/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MyPopku",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web",
        "description": "An AI-native platform for natural language programming. Generate interactive mini-apps, games, tools, and simulations instantly.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    ]
    </script>

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