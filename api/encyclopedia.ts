
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { EncyclopediaEntry } from '../types.js';

// Initialize Redis client from environment variables
// These must be set in the Vercel project settings
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
    // The `WRONGTYPE` error with `redis.get()` suggests the key does not hold a simple string.
    // Since the data is JSON but not a Hash, it might be stored using the RedisJSON module.
    // We will now use `redis.json.get` which is the correct command for that data type.
    const entries = await redis.json.get('entries');

    if (!entries) {
      return res.status(404).json({ error: 'Encyclopedia data not found or key is empty.' });
    }

    // `redis.json.get` automatically deserializes the data. We ensure it's an array.
    if (!Array.isArray(entries)) {
        return res.status(500).json({ error: 'Fetched data is not in the expected array format.' });
    }
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=60');

    return res.status(200).json(entries as EncyclopediaEntry[]);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return res.status(500).json({ error: 'Failed to fetch encyclopedia data.', details: message });
  }
}
