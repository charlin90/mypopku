import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pathname } = req.query;

  if (typeof pathname !== 'string' || !pathname) {
    return res.status(400).send('Invalid path');
  }

  try {
    const baseUrl = process.env.BLOB_STORAGE_URL;
    if (!baseUrl) {
      throw new Error("BLOB_STORAGE_URL environment variable is not set. Please configure it in your Vercel project settings.");
    }
    
    // Construct the full, correct URL for the blob asset.
    const blobUrl = `${baseUrl}/${pathname}`;

    // Use the standard fetch API to get the blob content from its public URL
    const fetchResponse = await fetch(blobUrl);

    // Check if the file was retrieved successfully
    if (!fetchResponse.ok) {
      if (fetchResponse.status === 404) {
        return res.status(404).send('Not Found');
      }
      throw new Error(`Failed to fetch blob: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }
    
    // Set headers to serve as HTML and to encourage caching.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=31536000, max-age=60, stale-while-revalidate=60');
    
    if (!fetchResponse.body) {
      return res.status(200).send('');
    }

    // Convert the web ReadableStream from fetch to a Node.js Readable stream
    const bodyStream = Readable.fromWeb(fetchResponse.body as any);

    // Pipe the Node.js stream to the response for efficient streaming
    return bodyStream.pipe(res);

  } catch (error: any) {
    console.error(`Error serving blob for path: ${pathname}`, error);
    if (error?.status === 404 || error.message.includes('404')) {
        return res.status(404).send('Not Found');
    }
    return res.status(500).send('Internal Server Error');
  }
}
