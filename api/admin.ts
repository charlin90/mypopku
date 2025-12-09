
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import type { CommunityShare } from '../types.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.headers['x-admin-secret'] as string;
  const envSecret = process.env.ADMIN_SECRET;

  // Simple security check. 
  if (!envSecret || secret !== envSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
        // 1. Get Latest (first 100)
        const latestRaw = await redis.lrange('community:shares', 0, 99);
        const latest = latestRaw as unknown as CommunityShare[];

        // 2. Get Featured IDs
        const featuredIds = await redis.zrange<string[]>('community:featured_ids', 0, -1);
        let featured: CommunityShare[] = [];
        
        if (featuredIds.length > 0) {
            // Fetch item details for featured IDs
            const featuredMap = await redis.hmget<Record<string, CommunityShare>>('shares', ...featuredIds);
            if (featuredMap) {
                // Map ensuring order and existence
                featured = featuredIds
                    .map(id => featuredMap[id])
                    .filter((item): item is CommunityShare => !!item);
            }
        }

        return res.status(200).json({ latest, featured });
    } catch (e) {
        console.error("Admin fetch error:", e);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
  }

  if (req.method === 'POST') {
    const { action, id } = req.body;
    if (!id || !action) return res.status(400).json({ error: 'Missing parameters' });

    try {
        if (action === 'ban') {
            // 1. Remove from Data Hash (Content becomes 404)
            await redis.hdel('shares', id);
            
            // 2. Remove from Feed List
            // We fetch a chunk of the list to find the exact object to remove
            const listItems = await redis.lrange('community:shares', 0, 200);
            const targetItem = listItems.find((s: any) => s.id === id);
            
            if (targetItem) {
                // LREM requires the exact value. Upstash SDK handles object serialization.
                await redis.lrem('community:shares', 1, targetItem);
            }
            
            // 3. Remove from Featured
            await redis.zrem('community:featured_ids', id);
            
            return res.status(200).json({ success: true });
        }

        if (action === 'feature') {
            // Add to ZSET with score 0 (default ordering)
            await redis.zadd('community:featured_ids', { member: id, score: 0 });
            return res.status(200).json({ success: true });
        }

        if (action === 'unfeature') {
            await redis.zrem('community:featured_ids', id);
            return res.status(200).json({ success: true });
        }
    } catch (e) {
        console.error("Admin action error:", e);
        return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
