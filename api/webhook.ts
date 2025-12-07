import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { Buffer } from 'buffer';

// Disable default body parser to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function getRawBody(req: VercelRequest): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    if (secret) {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
        const signatureHeader = req.headers['x-signature'];
        const signature = Buffer.from(Array.isArray(signatureHeader) ? signatureHeader[0] : (signatureHeader || ''), 'utf8');

        if (!crypto.timingSafeEqual(digest, signature)) {
            return res.status(401).send('Invalid signature');
        }
    }

    const payload = JSON.parse(rawBody.toString());
    const { meta, data } = payload;
    const eventName = meta.event_name;
    const customData = meta.custom_data || {};
    const userId = customData.user_id;

    // We only process if we have a userId attached to the order
    if (userId) {
        // Handle successful payments or subscription creation
        if (['order_created', 'subscription_created', 'subscription_updated', 'subscription_payment_success'].includes(eventName)) {
             // Extract plan name to support multiple tiers (Starter vs Pro)
             const variantName = data.attributes.variant_name || 'Pro Plan';
             
             // Use HSET to store all subscriptions in one hash
             await redis.hset('user_subscriptions', { [userId]: variantName });
        } 
        // Handle cancellations or expirations
        else if (['subscription_cancelled', 'subscription_expired'].includes(eventName)) {
             // Remove user from the subscriptions hash
             await redis.hdel('user_subscriptions', userId);
        }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).send('Server Error');
  }
}