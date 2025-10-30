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
    // Fetch the JSON string from the key 'entries'
    const dataString = await redis.get<string>('entries');

    if (!dataString) {
      return res.status(404).json({ error: 'Encyclopedia data not found.' });
    }

    // The data is stored as an object with numeric keys, let's parse and convert to an array
    const dataObject = JSON.parse(dataString);
    const entriesArray: EncyclopediaEntry[] = Object.values(dataObject);
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=60');

    return res.status(200).json(entriesArray);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return res.status(500).json({ error: 'Failed to fetch encyclopedia data.', details: message });
  }
}
