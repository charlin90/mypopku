
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { Buffer } from 'buffer';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Recursively traverse the object/array and upload base64 images to Vercel Blob
async function processAndUploadImages(data: any): Promise<any> {
  if (typeof data === 'string') {
    // Check if string is a base64 image (png, jpeg, jpg, gif, webp)
    // Pattern: data:image/png;base64,iVBOR...
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    if (base64Regex.test(data)) {
      try {
        const match = data.match(base64Regex);
        const ext = match ? match[1] : 'png';
        // Remove the data URI prefix to get pure base64 string
        const base64Data = data.replace(base64Regex, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save to 'app_images' folder as requested
        const filename = `app_images/${nanoid()}.${ext}`;
        
        const blob = await put(filename, buffer, {
          access: 'public',
          token: process.env.conceptxlab_READ_WRITE_TOKEN,
          addRandomSuffix: false // nanoid ensures uniqueness
        });
        
        // Return the public URL instead of the huge base64 string
        return blob.url;
      } catch (e) {
        console.warn("Failed to upload image to blob, keeping base64 fallback:", e);
        return data; 
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return Promise.all(data.map(item => processAndUploadImages(item)));
  }

  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    const keys = Object.keys(data);
    
    // Process object properties in parallel
    await Promise.all(keys.map(async (key) => {
      result[key] = await processAndUploadImages(data[key]);
    }));
    
    return result;
  }

  return data;
}

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
      let bodyData = req.body;

      // Handle cases where body is just a string (if JSON header missing)
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (e) {
          // Keep as string if parsing fails, though unlikely for app state
        }
      }

      // 1. Process payload to extract Base64 images and upload to Blob
      const processedData = await processAndUploadImages(bodyData);

      // 2. Stringify for Redis storage
      const dataToStore = JSON.stringify(processedData);
      
      // 3. Save to Redis (Persistent)
      await redis.set(key, dataToStore);
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Storage API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
