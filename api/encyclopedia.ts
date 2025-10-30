
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
    // CORRECTED: Use `redis.get()` to fetch the value of the key, which is a JSON object.
    // The SDK will handle parsing the JSON string into a JavaScript object.
    const dataObject = await redis.get<Record<string, EncyclopediaEntry>>('entries');

    if (!dataObject) {
      return res.status(404).json({ error: 'Encyclopedia data not found or key is empty.' });
    }

    // The result from `get` is an object like {"0": {...}, "1": {...}}.
    // We need to convert the values of this object into an array.
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
