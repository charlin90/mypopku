
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { Buffer } from 'buffer';
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

        if (action === 'update') {
            const { prompt, screenshot } = req.body;
            
            // 1. Fetch current item state
            const currentItem = await redis.hget('shares', id) as CommunityShare;
            if (!currentItem) return res.status(404).json({ error: 'Item not found' });

            const updatedItem = { ...currentItem };

            // 2. Update Prompt if provided
            if (prompt !== undefined) {
                updatedItem.prompt = prompt;
            }

            // 3. Update Screenshot if provided (Base64 -> Blob)
            if (screenshot) {
                try {
                    const imageBuffer = Buffer.from(screenshot.split(',')[1], 'base64');
                    const filename = `app_images/${nanoid()}.jpeg`;
                    const blob = await put(filename, imageBuffer, {
                        access: 'public',
                        token: process.env.conceptxlab_READ_WRITE_TOKEN,
                        addRandomSuffix: false,
                        contentType: 'image/jpeg'
                    });
                    updatedItem.screenshotUrl = blob.url;
                } catch (err) {
                    console.error("Failed to upload new screenshot:", err);
                    return res.status(500).json({ error: "Failed to upload image" });
                }
            }

            // 4. Save to Hash (Single Source of Truth)
            await redis.hset('shares', { [id]: updatedItem });

            // 5. Update Feed List (Cache Consistency)
            // We scan the top 200 items to see if this item is in the feed, and update it in place.
            // This prevents the feed from showing old data until a full refresh/rotation.
            const listItems = await redis.lrange('community:shares', 0, 199);
            const index = listItems.findIndex((item: any) => item.id === id);
            
            if (index !== -1) {
                // LSET updates the element at the specified index
                await redis.lset('community:shares', index, JSON.stringify(updatedItem));
            }

            return res.status(200).json({ success: true });
        }

    } catch (e) {
        console.error("Admin action error:", e);
        return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
