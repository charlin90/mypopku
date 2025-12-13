import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  let title = 'MyPopku - AI Mini App Generator';
  let description = 'An AI-native community for natural language programming. Generate interactive mini-apps, games, tools, and simulations with a single prompt.';
  let keywords = '';
  let imageUrl = 'https://popku.com/og-image.png';
  let promptText = 'MyPopku';
  let authorName = 'Anonymous';
  let createdAt = new Date().toISOString();
  let appType = 'SoftwareApplication';
  let shareItem: CommunityShare | null = null;

  const host = req.headers.host || 'popku.com';
  const canonicalUrl = `https://${host}/view/${id}`;

  if (id && typeof id === 'string') {
    try {
        const item = await redis.hget<CommunityShare>('shares', id);
        
        if (item) {
            shareItem = item;
            // Enhanced Keywords in Title
            const itemTitle = item.title || item.prompt;
            const typeLabel = item.type === 'learn' ? 'Interactive Lesson' : 'Web App';
            title = `${itemTitle} - ${typeLabel} | MyPopku`;
            
            // Richer Description
            if (item.description) {
                description = item.description;
            } else {
                description = `Play and explore "${item.prompt}". An AI-generated interactive ${item.type === 'learn' ? 'educational simulation' : 'game/tool'} created by ${item.authorName || 'Anonymous'} on MyPopku.`;
            }

            if (item.keywords) {
                keywords = item.keywords;
            }
            
            if (item.screenshotUrl) {
                imageUrl = item.screenshotUrl;
            }
            promptText = item.title || item.prompt;
            authorName = item.authorName || 'Anonymous';
            createdAt = new Date(item.createdAt).toISOString();
            appType = item.type === 'learn' ? 'LearningResource' : 'SoftwareApplication';
        }
    } catch (e) {
        console.error("Failed to fetch item for SEO:", e);
    }
  }

  // Structured Data (JSON-LD) for Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": appType,
    "name": title,
    "description": description,
    "applicationCategory": "EducationalGame",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "dateCreated": createdAt,
    "image": imageUrl,
    "url": canonicalUrl
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" href="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/icon/favicon32.png">
    <meta name="description" content="${description}">
    ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
    <meta name="baidu-site-verification" content="codeva-F9xglRgtNy" />
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="MyPopku">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${imageUrl}">
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
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
        
        /* Loading Placeholder Style */
        .server-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            padding: 2rem;
            text-align: center;
            opacity: 1;
            transition: opacity 0.3s;
        }
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
    <!-- Server-Side Injected Content (Visible to bots and users while loading) -->
    <div id="root">
        <div class="server-preview">
            <h1 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">${promptText}</h1>
            <p style="font-size: 1.25rem; max-width: 600px; margin: 0 auto 2rem; line-height: 1.6;">${description}</p>
            
            <div style="display: flex; gap: 1rem; justify-content: center; font-size: 0.9rem; color: #555;">
                <span><strong>Author:</strong> ${authorName}</span>
                <span>•</span>
                <span><strong>Created:</strong> ${new Date(createdAt).toLocaleDateString()}</span>
            </div>
            
            <div style="margin-top: 3rem;">
               <div style="width: 48px; height: 48px; border: 4px solid black; border-top-color: #f472b6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            <style>
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            </style>
        </div>
    </div>
    
    <!-- Inject Data for Hydration -->
    <script>
      window.__INITIAL_DATA__ = ${JSON.stringify(shareItem)};
    </script>
    
    <script type="module" src="/index.js"></script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
  
  return res.status(200).send(html);
}