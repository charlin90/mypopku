
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
    
    // --- DEBUGGING ---
    // Log the raw data structure from Redis to see what we're working with.
    // The `lrange` command returns an array of strings for a list.
    // console.log('Raw data from Redis:', JSON.stringify(data, null, 2));
    
    // FIX: The `lrange` method returns an array of JSON strings that must be parsed.
    // The previous direct cast was incorrect.
    // const shares: CommunityShare[] = data.map(item => JSON.parse(item as string));
    let shares: CommunityShare[];
    shares = data as unknown as CommunityShare[]; 
    //const shares: CommunityShare[] = data as CommunityShare[];
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return res.status(200).json(shares);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return res.status(500).json({ error: 'Failed to fetch community data.', details: message });
  }
}
