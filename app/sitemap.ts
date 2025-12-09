import { MetadataRoute } from 'next';
import { redis } from '@/lib/redis';
import type { CommunityShare } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shares = await redis.lrange('community:shares', 0, 1000) as unknown as CommunityShare[];
  
  const entries: MetadataRoute.Sitemap = shares.map((share) => ({
    url: `https://popku.com/view/${share.id}`,
    lastModified: new Date(share.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: 'https://popku.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...entries,
  ];
}