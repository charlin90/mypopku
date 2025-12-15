
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Fetch a larger batch to categorization
    const sharesRaw = await redis.lrange('community:shares', 0, 99);
    const shares = sharesRaw as unknown as CommunityShare[];

    // Simple categorization logic for SEO grouping
    const categories = {
        games: shares.filter(s => /game|play|arcade|tetris|snake|pong|minecraft|mario|zelda|rpg|游戏/i.test(s.prompt)).slice(0, 10),
        tools: shares.filter(s => /tool|calc|convert|generate|track|clock|todo|list|note|工具|计算/i.test(s.prompt)).slice(0, 10),
        learning: shares.filter(s => s.type === 'learn' || /learn|study|explain|simulat|math|physics|chem|教育|学习|模拟/i.test(s.prompt)).slice(0, 10),
        latest: shares.slice(0, 20) // Fallback mix
    };
    
    // Helper to generate list items with dynamic suffixes
    const renderList = (items: CommunityShare[], defaultSuffix: string) => items.map(item => {
        let suffix = defaultSuffix;
        if (item.type === 'learn') suffix = "Interactive Lesson";
        else if (/game/i.test(item.prompt)) suffix = "AI Generated Game";
        else if (/tool/i.test(item.prompt)) suffix = "AI Tool";
        
        return `
        <li style="margin-bottom: 0.5rem;">
            <a href="/view/${item.id}" style="color: #2563eb; text-decoration: underline;">
                <strong>${item.prompt.replace(/</g, '&lt;')}</strong> - ${suffix}
            </a>
            <span style="color: #666; font-size: 0.9em;"> by ${item.authorName || 'Anonymous'}</span>
        </li>
    `}).join('');

    const serverContent = `
        <div id="server-content" style="padding: 2rem; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <div style="margin-bottom: 3rem; text-align: center;">
                <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">MyPopku: AI-Native Creative Coding Community</h1>
                <p style="font-size: 1.25rem; color: #444; line-height: 1.6;">
                    <strong>Code is the closest thing we have to magic.</strong><br>
                    Turn your emotions, stories, and imagination into interactive digital art and immersive experiences instantly.
                    <br><strong>Try it now</strong> - The best free alternative to Websim.
                </p>
                <div style="margin-top: 2rem;">
                   <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #000; border-top-color: #f472b6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                   <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
                </div>
            </div>
            
            <div style="display: grid; gap: 2rem; border-top: 1px solid #eee; padding-top: 2rem;">
                ${categories.games.length > 0 ? `
                <section>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">AI Generated Games</h2>
                    <ul style="list-style: none; padding: 0;">${renderList(categories.games, 'HTML5 Game')}</ul>
                </section>` : ''}

                ${categories.tools.length > 0 ? `
                <section>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Useful Tools & Utilities</h2>
                    <ul style="list-style: none; padding: 0;">${renderList(categories.tools, 'Web Tool')}</ul>
                </section>` : ''}

                ${categories.learning.length > 0 ? `
                <section>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Interactive Simulations</h2>
                    <ul style="list-style: none; padding: 0;">${renderList(categories.learning, 'Simulation')}</ul>
                </section>` : ''}
                
                <section>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Latest Community Creations</h2>
                    <ul style="list-style: none; padding: 0;">${renderList(categories.latest, 'Mini App')}</ul>
                </section>
            </div>
            
            <div style="margin-top: 4rem; padding: 2rem; background: #f9fafb; border-radius: 1rem; color: #4b5563;">
                <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 1rem; color: #000;">Why use MyPopku?</h3>
                <p style="margin-bottom: 1rem; line-height: 1.6;">
                    <strong>Code is Magic.</strong> MyPopku is an <strong>AI-Native Creative Coding Community</strong>.
                    Turn your emotions, stories, and imagination into interactive digital art and immersive experiences instantly.
                </p>
                <p style="line-height: 1.6;">
                    Looking for a <strong>Websim best alternative</strong>? Just describe your idea in natural language, and watch as our AI builds fully functional interactive content, generative art, and games in seconds.
                </p>
            </div>
        </div>
    `;

    // 3. Construct the full HTML response
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyPopku - AI-Native Creative Coding Community | Code is Magic</title>
    <link rel="icon" href="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/icon/favicon32.png">
    
    <meta name="description" content="Code is the closest thing we have to magic. MyPopku is an AI-Native Creative Coding Community. Turn your emotions, stories, and imagination into interactive digital art instantly. The best free alternative to Websim.">
    <meta name="keywords" content="AI Creative Coding, Generative Art, Digital Magic, Interactive Storytelling, Emotional AI, Natural Language Programming, Generative UI, Websim Alternative, AI Game Maker, MyPopku, 创意编程, 生成式艺术, 数字魔法, 互动叙事">
    <meta name="baidu-site-verification" content="codeva-F9xglRgtNy" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="MyPopku - AI-Native Creative Coding Community">
    <meta property="og:description" content="Code is the closest thing we have to magic. Turn your emotions, stories, and imagination into interactive digital art instantly.">
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
        "description": "An AI-native creative coding community. Turn your emotions, stories, and imagination into interactive digital art instantly.",
        "featureList": "Creative Coding, Generative Art, Interactive Storytelling, Natural Language Programming",
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
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering homepage:', error);
    return res.status(500).send('Error loading page');
  }
}