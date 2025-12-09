import { Metadata, ResolvingMetadata } from 'next';
import { redis } from '@/lib/redis';
import { CommunityShare } from '@/types';
import { BlobExplainerView } from '@/components/BlobExplainerView';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type Props = {
  params: { id: string }
};

// SEO: Generate Dynamic Metadata
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const item = await redis.hget('shares', params.id) as CommunityShare | null;

  if (!item) {
    return {
      title: 'Item Not Found - Popku',
    };
  }

  const title = `${item.prompt} - Popku`;
  const description = `Check out this interactive concept generated on Popku: ${item.prompt}`;
  const images = item.screenshotUrl ? [item.screenshotUrl] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function ViewPage({ params }: Props) {
  const item = await redis.hget('shares', params.id) as CommunityShare | null;

  if (!item) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-4">
            <h1 className="text-4xl font-black mb-4">404 - Not Found</h1>
            <p className="mb-8">This creation seems to have vanished into the void.</p>
            <Link href="/" className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
                Go Home
            </Link>
        </div>
    );
  }

  // Increment view count (fire and forget)
  // In Next.js server components, we can just call redis directly, but for async without awaiting
  // inside a render, it's safer to just let the client side trigger the view count api 
  // or await it here if we don't mind the tiny latency.
  await redis.hincrby('views', params.id, 1);

  // Render the BlobExplainerView within a Client Wrapper if interactivity is needed,
  // or strictly here if it's just an iframe.
  return (
    <div className="w-full h-screen relative bg-amber-50">
       <BlobExplainerView 
         blobUrl={item.blobUrl} 
         prompt={item.prompt} 
         onBack={() => redirect('/')} // Server action redirect or client navigation handled in component
       />
    </div>
  );
}