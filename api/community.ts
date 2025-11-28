
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
    let shares: CommunityShare[] = [];
    const { filter } = req.query;
    const mode = Array.isArray(filter) ? filter[0] : filter;

    if (mode === 'featured') {
        // Fetch IDs from the featured set
        const ids = await redis.smembers('community:featured_ids');
        
        if (ids && ids.length > 0) {
            // Fetch actual item data from the shares hash
            // hmget returns a Record<string, T> in the current SDK version for multiple keys
            const sharesMap = await redis.hmget<Record<string, CommunityShare>>('shares', ...ids);
            
            if (sharesMap) {
                shares = Object.values(sharesMap).filter((item): item is CommunityShare => !!item);
            }
        }
    } else {
        // Default: Fetch all items from the list (Latest)
        // For large lists, consider pagination in the future.
        const data = await redis.lrange('community:shares', 0, -1);
        shares = data as unknown as CommunityShare[];
    }
    
    // Fetch view counts for all shares in one go using Hash
    if (shares.length > 0) {
        const ids = shares.map(s => s.id);
        
        // HMGET in Upstash SDK returns a Record<string, T> mapping fields to values
        const views = await redis.hmget<Record<string, number>>('views', ...ids);
        
        shares = shares.map((share) => ({
            ...share,
            // Access the view count from the record object using the ID
            // If views is null or the key doesn't exist, default to 0
            views: views ? (views[share.id] || 0) : 0
        }));
    }
    
    // Sort by Date Descending
    shares.sort((a, b) => b.createdAt - a.createdAt);
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return res.status(200).json(shares);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return res.status(500).json({ error: 'Failed to fetch community data.', details: message });
  }
}
