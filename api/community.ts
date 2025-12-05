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
        // Fetch IDs from the featured sorted set
        // We use zrange (0, -1) to get all members sorted by score.
        const ids = await redis.zrange<string[]>('community:featured_ids', 0, -1);
        
        if (ids && ids.length > 0) {
            // Fetch actual item data from the shares hash
            const sharesMap = await redis.hmget<Record<string, CommunityShare>>('shares', ...ids);
            
            if (sharesMap) {
                // IMPORTANT: Use the ordered 'ids' array to map the values. 
                // Object.values() does not guarantee order.
                shares = ids
                    .map(id => sharesMap[id])
                    .filter((item): item is CommunityShare => !!item);
            }
        }
    } else {
        // Fetch all items from the list (for other categories/latest)
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

    // Apply Filters & Sorting based on mode
    if (mode === 'most_viewed') {
        shares.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (mode === 'christmas') {
         shares = shares.filter(s => /christmas|圣诞|平安夜|新年/i.test(s.prompt));
         shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'games') {
        shares = shares.filter(s => /game|play|arcade|tetris|snake|pong|minecraft|mario|zelda|rpg|platformer|adventure|puzzle|card|chess|sudoku|2048|flappy|clicker|rogue|survival|sim|racing|shooter|fps|tower|defense|strategy|游戏|玩/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'tools') {
        shares = shares.filter(s => /tool|calc|convert|generate|track|time|clock|stopwatch|count|weather|finance|money|budget|todo|list|note|memo|edit|format|regex|json|code|dev|util|browser|viewer|scanner|reader|工具|计算|器|生成|转换/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'art') {
        shares = shares.filter(s => /art|draw|paint|sketch|canvas|pixel|voxel|3d|three|webgl|shader|animate|visual|design|pattern|fractal|mandala|color|palette|gradient|css|effect|gallery|showcase|portfolio|艺术|绘画|设计|图像|画/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'education') {
        shares = shares.filter(s => s.type === 'learn' || /learn|study|teach|tutor|explain|concept|simulat|experiment|lab|math|physics|chem|bio|history|geography|language|vocab|grammar|flashcard|quiz|test|exam|course|lesson|guide|tutorial|how|to|educat|school|university|student|教育|学习|模拟|实验|数学|物理|化学/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'ai') {
        shares = shares.filter(s => /ai|artificial|intelligen|gpt|llm|model|bot|agent|chat|assist|neural|network|machine|learning|ml|dl|vision|voice|recogni|gen|diffus|transformer|openai|gemini|llama|claude|cohere|mistral|anthropic|stability|runway|midjourney|sora|pika|sunno|udios|人工|智能|模型/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'music') {
        shares = shares.filter(s => /music|audio|sound|sonic|song|track|play|listen|synth|oscillator|frequency|wave|beat|drum|rhythm|melody|harmony|chord|scale|piano|guitar|violin|instrument|midi|sequencer|daw|mix|dj|mp3|wav|ogg|音乐|声音|音频|乐器/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode === 'misc') {
        shares = shares.filter(s => /misc|random|fun|joke|meme|magic|trick|tarot|horoscope|fortune|cookie|dice|coin|flip|spin|wheel|decision|picker|lottery|raffle|prize|gift|card|greeting|holiday|xmas|christmas|halloween|easter|valentine|festival|party|celebrat|event|date|calendar|time|zone|world|map|globe|earth|space|universe|star|planet|galaxy|alien|ufo|crypt|blockchain|nft|web3|meta|verse|vr|ar|xr|mr|other|etc|趣味|其他|杂项/i.test(s.prompt));
        shares.sort((a, b) => b.createdAt - a.createdAt);
    } else if (mode !== 'featured') {
        // Default (Latest)
        shares.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return res.status(200).json(shares);

  } catch (error) {
    console.error('Error fetching from Redis:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return res.status(500).json({ error: 'Failed to fetch community data.', details: message });
  }
}