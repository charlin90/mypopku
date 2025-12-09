import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host || 'popku.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  const robots = `User-agent: *
Allow: /
Disallow: /api/

# Sitemap
Sitemap: ${protocol}://${host}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(robots);
}