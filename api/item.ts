
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    // Increment view count using Hash to keep keys organized
    // Key: 'views', Field: id, Increment: 1
    await redis.hincrby('views', id, 1);

    // Fetch from the hash 'shares' instead of individual key
    const item = await redis.hget('shares', id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=60');

    return res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching item from Redis:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}
