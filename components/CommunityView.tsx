
import React, { useEffect, useState } from 'react';
import type { CommunityShare } from '../types.js';

interface CommunityViewProps {
  onBack: () => void;
  onLoadBlobConcept: (blobUrl: string) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
);

const CommunityCard: React.FC<{ item: CommunityShare, onClick: () => void }> = ({ item, onClick }) => (
  <button 
    onClick={onClick}
    className="group bg-gray-800/50 border border-gray-700 rounded-lg text-left transition-all hover:bg-gray-800 hover:border-teal-500 hover:scale-105 overflow-hidden flex flex-col h-full"
  >
    <div className="w-full aspect-video bg-gray-900 overflow-hidden">
      {item.screenshotUrl ? (
        <img
          src={item.screenshotUrl}
          alt={`Preview for ${item.prompt}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        </div>
      )}
    </div>
    <div className="p-4 flex flex-col flex-grow">
      <p className="text-sm text-gray-400 flex-grow prompt-truncate" title={item.prompt}>
        {item.prompt}
      </p>
    </div>
  </button>
);


export const CommunityView: React.FC<CommunityViewProps> = ({ onBack, onLoadBlobConcept }) => {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunityShares = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/community');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load community creations.');
        }
        const data: CommunityShare[] = await response.json();
        setShares(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunityShares();
  }, []);

  const learnShares = shares.filter(s => s.type === 'learn');
  const createShares = shares.filter(s => s.type === 'create');

  return (
    <>
    <style>{`
        .prompt-truncate {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;  
          overflow: hidden;
          text-overflow: ellipsis;
        }
    `}</style>
    <div className="w-full min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <button 
            onClick={onBack} 
            className="w-12 h-12 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-2xl hover:bg-gray-700 transition-colors"
            aria-label="Go back to Home"
        >
            ←
        </button>
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 text-transparent bg-clip-text">
            Community Gallery
        </h1>
        {/* Placeholder for potential future controls like sorting */}
        <div className="w-12"></div> 
      </header>

      <main className="w-full max-w-7xl mx-auto">
        {isLoading ? (
            <div className="flex justify-center items-center h-96">
                <LoadingSpinner />
            </div>
        ) : error ? (
            <div className="text-center py-10 text-red-400 bg-red-900/20 border border-red-800 rounded-lg max-w-md mx-auto">
                <p className="text-lg font-semibold">Could not load creations</p>
                <p className="mt-1 text-red-300">{error}</p>
            </div>
        ) : (
          <div className="space-y-16">
            <section>
              <h2 className="text-2xl font-bold text-gray-300 border-b-2 border-gray-700 pb-2 mb-6">From Learn Mode</h2>
              {learnShares.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {learnShares.map(item => (
                    <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No 'Learn' experiments have been shared yet. Be the first!</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-300 border-b-2 border-gray-700 pb-2 mb-6">From Create Mode</h2>
              {createShares.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {createShares.map(item => (
                    <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No 'Create' experiments have been shared yet. Go make something amazing!</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
    </>
  );
};
