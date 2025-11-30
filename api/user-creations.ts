
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

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    // 1. Get List of IDs for this user
    const ids = await redis.lrange(`user:${userId}:shares`, 0, -1);

    if (ids.length === 0) {
        return res.status(200).json([]);
    }

    // 2. Fetch details from the global hash
    const sharesMap = await redis.hmget<Record<string, CommunityShare>>('shares', ...ids);
    
    // 3. Map IDs to objects, filter out nulls
    let shares: CommunityShare[] = [];
    if (sharesMap) {
         shares = ids
            .map(id => sharesMap[id])
            .filter((item): item is CommunityShare => !!item);
    }

    // 4. Get view counts
    if (shares.length > 0) {
        const itemIds = shares.map(s => s.id);
        const views = await redis.hmget<Record<string, number>>('views', ...itemIds);
        
        shares = shares.map((share) => ({
            ...share,
            views: views ? (views[share.id] || 0) : 0
        }));
    }

    // Sort by latest first
    shares.sort((a, b) => b.createdAt - a.createdAt);

    return res.status(200).json(shares);
  } catch (error) {
    console.error('Error fetching user creations:', error);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
}
