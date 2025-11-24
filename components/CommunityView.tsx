
import React, { useEffect, useState } from 'react';
import type { CommunityShare } from '../types.js';

interface CommunityViewProps {
  onBack: () => void;
  onLoadBlobConcept: (blobUrl: string) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-12 h-12 border-4 border-black border-t-pink-500 rounded-full animate-spin"></div>
);

const CommunityCard: React.FC<{ item: CommunityShare, onClick: () => void }> = ({ item, onClick }) => (
  <button 
    onClick={onClick}
    className="group bg-white border-2 border-black rounded-xl text-left transition-all hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-full relative"
  >
    <div className="absolute top-2 right-2 z-10">
        <span className={`px-2 py-1 text-xs font-bold border border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${item.type === 'learn' ? 'bg-pink-300 text-black' : 'bg-lime-300 text-black'}`}>
            {item.type === 'learn' ? 'LEARN' : 'CREATE'}
        </span>
    </div>
    <div className="w-full aspect-video bg-gray-100 border-b-2 border-black overflow-hidden relative">
      {item.screenshotUrl ? (
        <img
          src={item.screenshotUrl}
          alt={`Preview for ${item.prompt}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        </div>
      )}
    </div>
    <div className="p-4 flex flex-col flex-grow bg-white">
      <p className="text-sm font-bold text-black flex-grow prompt-truncate leading-snug" title={item.prompt}>
        {item.prompt}
      </p>
      <div className="mt-3 text-xs font-mono text-gray-500 text-right">
        {new Date(item.createdAt).toLocaleDateString()}
      </div>
    </div>
  </button>
);


export const CommunityView: React.FC<CommunityViewProps> = ({ onBack, onLoadBlobConcept }) => {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'learn' | 'create'>('learn');

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
        setShares(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunityShares();
  }, []);

  const displayedShares = shares.filter(s => s.type === activeTab);
  
  const tabBtnBase = "px-6 py-2 rounded-xl text-sm font-bold transition-all border-2 border-black";
  const activeBtn = "bg-yellow-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5";
  const inactiveBtn = "bg-white text-gray-500 hover:bg-gray-50 shadow-none";

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
    <div className="w-full min-h-screen bg-amber-50 text-black p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <button 
            onClick={onBack} 
            className="w-12 h-12 bg-white border-2 border-black rounded-full flex items-center justify-center text-2xl hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            aria-label="Go back to Home"
        >
            ←
        </button>
        <h1 className="text-4xl md:text-6xl font-black text-black drop-shadow-[3px_3px_0px_#f472b6]">
            Community
        </h1>
        <div className="w-12"></div> 
      </header>

      <main className="w-full max-w-7xl mx-auto">
        <div className="flex justify-center mb-10">
            <div className="bg-white border-2 border-black p-1 rounded-2xl flex items-center space-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setActiveTab('learn')} className={`${tabBtnBase} ${activeTab === 'learn' ? activeBtn : inactiveBtn}`}>Learn</button>
              <button onClick={() => setActiveTab('create')} className={`${tabBtnBase} ${activeTab === 'create' ? activeBtn : inactiveBtn}`}>Create</button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-96">
                <LoadingSpinner />
            </div>
        ) : error ? (
            <div className="text-center py-10 bg-red-100 border-2 border-red-500 rounded-xl shadow-[4px_4px_0px_0px_#ef4444] text-red-800 max-w-md mx-auto">
                <p className="text-lg font-bold">Oops!</p>
                <p className="mt-1">{error}</p>
            </div>
        ) : (
          <div>
            {displayedShares.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayedShares.map(item => (
                  <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white border-2 border-black border-dashed rounded-3xl mx-auto max-w-lg">
                <p className="text-2xl font-black text-gray-400">
                   👻 Ghost Town
                </p>
                <p className="mt-2 text-gray-500 font-medium">
                  {activeTab === 'learn' 
                    ? "No 'Learn' shares yet. Be the first!"
                    : "No 'Create' shares yet. Go make something!"
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
};
