
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Read the environment variable on the server side
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return res.status(500).json({ error: 'Clerk Publishable Key is not configured on the server.' });
  }

  // Return the key to the client
  return res.status(200).json({ publishableKey });
}