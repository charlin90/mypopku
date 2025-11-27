
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Fetch all items from the list. For large lists, consider pagination.
    const data = await redis.lrange('community:shares', 0, -1);
    
    let shares = data as unknown as CommunityShare[]; 
    
    // Fetch view counts for all shares in one go using Hash
    if (shares.length > 0) {
        const ids = shares.map(s => s.id);
        
        // HMGET returns an array of values corresponding to the requested fields (ids)
        // Since 'views' is now a single Hash key
        const views = await redis.hmget<number[]>('views', ...ids);
        
        shares = shares.map((share, i) => ({
            ...share,
            // If the hash field doesn't exist, views[i] will be null, so we default to 0
            views: views && views[i] ? Number(views[i]) : 0
        }));
    }
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return res.status(200).json(shares);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return res.status(500).json({ error: 'Failed to fetch community data.', details: message });
  }
}
