
import React, { useEffect, useState } from 'react';
import type { CommunityShare } from '../types.js';

interface MyPopkuViewProps {
  userId: string;
  onLoadBlobConcept: (blobUrl: string) => void;
  onBack: () => void;
}

const CommunityCard: React.FC<{ item: CommunityShare, onClick: () => void }> = ({ item, onClick }) => (
  <a 
    href={`/view/${item.id}`}
    onClick={(e) => {
      e.preventDefault();
      window.history.pushState({}, '', `/view/${item.id}`);
      onClick();
    }}
    className="group bg-white border-2 border-black rounded-xl text-left transition-all hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-full relative"
  >
    <div className="absolute top-2 right-2 z-10 flex gap-1.5">
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
      <p className="text-sm font-bold text-black flex-grow line-clamp-3 leading-snug" title={item.prompt}>
        {item.prompt}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200" title={`${item.views || 0} views`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-500">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-bold text-gray-500 font-mono">{item.views || 0}</span>
        </div>
        <div className="text-xs font-mono text-gray-500 text-right">
            {new Date(item.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  </a>
);

export const MyPopkuView: React.FC<MyPopkuViewProps> = ({ userId, onLoadBlobConcept, onBack }) => {
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserShares = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/user-creations?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to load your creations.');
        }
        const data: CommunityShare[] = await response.json();
        setShares(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) {
        fetchUserShares();
    }
  }, [userId]);

  return (
    <div className="flex flex-col w-full h-full bg-white relative overflow-hidden">
      <header className="flex-none w-full h-20 border-b-4 border-black bg-white flex items-center px-6 z-30 sticky top-0">
          <button 
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 bg-white text-black mr-4"
          >
             Back Home
          </button>
          <h2 className="text-2xl font-black">My Popku Gallery</h2>
      </header>

      <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white relative z-0">
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-black border-t-pink-500 rounded-full animate-spin"></div>
             </div>
          ) : error ? (
             <div className="text-center py-10 bg-gray-50 border-2 border-black rounded-xl max-w-md mx-auto">
                <p className="text-lg font-bold">Failed to load</p>
                <p className="text-sm text-red-500">{error}</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {shares.length > 0 ? (
                    shares.map(item => (
                        <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl">
                        <p className="text-2xl font-black text-gray-300">No creations yet!</p>
                        <p className="text-gray-400 mt-2">
                           Start creating via the search bar on the home screen.
                        </p>
                    </div>
                )}
            </div>
          )}
      </main>
    </div>
  );
};
