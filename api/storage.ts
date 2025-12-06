import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS so the iframe/generated code can contact this endpoint easily
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  const appId = Array.isArray(id) ? id[0] : id;

  if (!appId) {
    return res.status(400).json({ error: 'Missing app id' });
  }

  // Key for storing the state of a specific app instance
  const key = `app_state:${appId}`;

  try {
    if (req.method === 'GET') {
      const data = await redis.get(key);
      // Return null or empty object if no data exists
      return res.status(200).json(data || null);
    }

    if (req.method === 'POST') {
      // Store the body. If it's an object, stringify it.
      const dataToStore = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      // Save to Redis (Persistent)
      await redis.set(key, dataToStore);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Storage API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}