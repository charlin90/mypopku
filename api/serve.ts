import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get } from '@vercel/blob';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = req.query;

  if (typeof pathname !== 'string' || !pathname) {
    return res.status(400).send('Invalid path');
  }

  try {
    // The `get` function requires the full URL. We construct it from the store ID
    // in the environment variable and the pathname from the request.
    const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[2];
    if (!storeId) {
      throw new Error("Could not determine blob store ID from environment variables.");
    }
    const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;

    // Get the blob content from storage
    const blobResponse = await get(blobUrl);
    
    // Set headers to serve as HTML and to encourage caching.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=31536000, max-age=60, stale-while-revalidate=60');

    // Stream the blob's body directly to the client response.
    // This is memory-efficient as it doesn't load the whole file on the server.
    return blobResponse.body.pipe(res);

  } catch (error: any) {
    console.error(`Error serving blob for path: ${pathname}`, error);
    // Check for 404 errors from the blob storage client
    if (error?.status === 404 || error.message.includes('404')) {
        return res.status(404).send('Not Found');
    }
    return res.status(500).send('Internal Server Error');
  }
}