import React, { useState, useEffect, useRef } from 'react';
import type { CommunityShare } from '../types.js';
import type { FeedTab } from '../App.js';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

interface HomeScreenProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  userId?: string;
  viewingProfileId?: string | null;
  onUserClick: (authorId: string) => void;
  onUnifiedSubmit: (input: string) => void;
  onFileUpload: (htmlContent: string, prompt: string, screenshotDataUrl: string) => void;
  onLoadBlobConcept: (blobUrl: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshTrigger: number;
}

const CommunityCard: React.FC<{ item: CommunityShare, onClick: () => void, onUserClick: (id: string) => void }> = ({ item, onClick, onUserClick }) => (
  <a 
    href={`/view/${item.id}`}
    onClick={(e) => {
      e.preventDefault();
      window.history.pushState({}, '', `/view/${item.id}`);
      // Trigger view increment without blocking navigation
      fetch(`/api/item?id=${item.id}`).catch(() => {});
      onClick();
    }}
    className="group bg-white border-2 border-black rounded-xl text-left transition-all hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-full relative"
  >
    <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        {/game|arcade|tetris|snake|pong|minecraft|mario|zelda|游戏/i.test(item.prompt) ? (
            <span className="px-2 py-1 text-xs font-bold border border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-purple-300 text-black">
                GAME
            </span>
        ) : (
            <span className={`px-2 py-1 text-xs font-bold border border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${item.type === 'learn' ? 'bg-pink-300 text-black' : 'bg-lime-300 text-black'}`}>
                {item.type === 'learn' ? 'LEARN' : 'CREATE'}
            </span>
        )}
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
        <div className="flex items-center gap-2 min-w-0">
             <div 
                className={`w-6 h-6 rounded-full border border-black overflow-hidden bg-gray-200 flex-shrink-0 ${item.userId ? 'cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all' : ''}`}
                onClick={(e) => {
                  if (item.userId) {
                    e.preventDefault();
                    e.stopPropagation();
                    onUserClick(item.userId);
                  }
                }}
             >
                {item.authorAvatarUrl ? (
                    <img src={item.authorAvatarUrl} alt={item.authorName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-200">
                        {item.authorName ? item.authorName[0].toUpperCase() : '?'}
                    </div>
                )}
            </div>
            <span className="text-xs font-bold text-gray-700 truncate max-w-[80px] sm:max-w-[100px]" title={item.authorName || 'Anonymous'}>
                {item.authorName || 'Anonymous'}
            </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 flex-shrink-0" title={`${item.views || 0} views`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-500">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-bold text-gray-500 font-mono">{item.views || 0}</span>
        </div>
      </div>
    </div>
  </a>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  activeTab,
  onTabChange,
  userId,
  viewingProfileId,
  onUserClick,
  onUnifiedSubmit,
  onFileUpload,
  onLoadBlobConcept,
  isLoading, 
  error,
  refreshTrigger,
}) => {
  const [inputValue, setInputValue] = useState('');
  
  // Community Feed State
  const [shares, setShares] = useState<CommunityShare[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadPrompt, setUploadPrompt] = useState('');

  // WeChat Modal State
  const [showWeChatModal, setShowWeChatModal] = useState(false);

  // Dropdown / Search State
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Determine effective user ID for the personal tab (either viewing another user or self)
  const effectiveUserId = viewingProfileId || userId;
  const isViewingOther = viewingProfileId && viewingProfileId !== userId;

  // Fetch community shares or user creations when tab changes
  useEffect(() => {
    const fetchShares = async () => {
      setIsFeedLoading(true);
      setFeedError(null);
      try {
        let endpoint = `/api/community?filter=${activeTab}`;
        
        if (activeTab === 'personal') {
            if (!effectiveUserId) {
                // If we somehow got here without a user ID, empty list
                setShares([]);
                setIsFeedLoading(false);
                return;
            }
            endpoint = `/api/user-creations?userId=${effectiveUserId}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load creations.');
        }
        const data: CommunityShare[] = await response.json();
        setShares(data);
      } catch (err) {
        setFeedError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsFeedLoading(false);
      }
    };
    fetchShares();
  }, [activeTab, effectiveUserId, refreshTrigger]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredShares = inputValue.trim().length > 1 
    ? shares.filter(item => item.prompt.toLowerCase().includes(inputValue.toLowerCase().trim())).slice(0, 4)
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
  };

  const handleExistingSelect = (blobUrl: string) => {
    onLoadBlobConcept(blobUrl);
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (inputValue && !isLoading) {
      onUnifiedSubmit(inputValue);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!htmlFile || !screenshotFile || !uploadPrompt.trim() || isLoading) return;

    try {
      const [htmlContent, screenshotDataUrl] = await Promise.all([
        htmlFile.text(),
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(screenshotFile);
        })
      ]);

      onFileUpload(htmlContent, uploadPrompt, screenshotDataUrl);

      setHtmlFile(null);
      setScreenshotFile(null);
      setUploadPrompt('');
      setShowUploadForm(false);
    } catch (error) {
      console.error("Error reading files for upload:", error);
    }
  };

  const primaryBtn = "px-6 py-2 rounded-xl text-sm font-bold border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed bg-teal-300 text-black hover:bg-teal-400";
  const authBtn = "px-4 py-2 rounded-xl text-sm font-bold border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-none active:translate-y-0.5 bg-yellow-300 text-black hover:bg-yellow-400";
  const socialBtn = "w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-gray-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none";

  return (
    <div className="flex flex-col w-full h-full bg-white relative overflow-hidden">
      
      {/* Sticky Header */}
      <header className="flex-none w-full h-20 border-b-4 border-black bg-white flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
         {/* Left: Logo */}
         <div className="flex flex-col justify-center flex-shrink-0 lg:flex-1 lg:min-w-0">
             <div className="text-xl sm:text-2xl font-black italic tracking-tighter text-black flex items-center gap-2">
                 <div className="w-8 h-8 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                     P
                 </div>
                 <span className="hidden sm:inline">Popku</span>
             </div>
             <span className="hidden lg:block text-[10px] font-bold text-gray-500 tracking-wide mt-0.5">
                An AI-native community for creating and sharing interactive content
             </span>
         </div>

         {/* Center: Unified Input Omni-box */}
         <div className="flex-grow max-w-2xl mx-4 relative z-50 lg:flex-grow-0 lg:w-full" ref={searchContainerRef}>
             <form onSubmit={handleSubmit} className="relative z-20">
                 <input
                     type="text"
                     value={inputValue}
                     onChange={handleInputChange}
                     onFocus={() => setShowDropdown(true)}
                     className="w-full h-12 rounded-full border-2 border-black px-4 bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-yellow-200 transition-all font-bold"
                     placeholder="What do you want to learn or create?"
                     disabled={isLoading}
                 />
                 <button 
                    type="submit" 
                    className="absolute right-2 top-2 h-8 w-8 bg-teal-300 border-2 border-black rounded-lg flex items-center justify-center hover:bg-teal-400 active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all disabled:opacity-50"
                    disabled={isLoading}
                 >
                     {isLoading ? (
                         <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                         </svg>
                     )}
                 </button>
             </form>
             
             {/* Dropdown Results */}
             {showDropdown && inputValue.trim().length > 1 && filteredShares.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50">
                    <div className="p-2">
                        <div className="text-xs font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">Community</div>
                        {filteredShares.map(share => (
                            <button
                                key={share.id}
                                onClick={() => handleExistingSelect(share.blobUrl)}
                                className="w-full text-left px-3 py-2 hover:bg-yellow-50 rounded-lg flex items-center justify-between group transition-colors"
                            >
                                <span className="font-medium truncate mr-2">{share.prompt}</span>
                                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 group-hover:border-yellow-200 group-hover:bg-yellow-100">
                                    {share.type === 'learn' ? 'LEARN' : 'CREATE'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
             )}
         </div>

         {/* Right: Auth & Profile */}
         <div className="flex items-center justify-end gap-3 flex-shrink-0 lg:flex-1 lg:min-w-0">
             <button onClick={() => setShowUploadForm(true)} className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-pink-300 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-400 hover:-translate-y-0.5 transition-all active:shadow-none active:translate-y-0.5" title="Upload HTML">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                 </svg>
             </button>
             
             <button onClick={() => setShowWeChatModal(true)} className={`${socialBtn} hidden md:flex`} title="Join WeChat Group">
                <img src="/wechat.png" alt="WeChat" className="w-6 h-6 object-contain" />
             </button>
             
             <a href="https://x.com/Tiseno1024" target="_blank" rel="noopener noreferrer" className={`${socialBtn} hidden md:flex`} title="Follow on X">
                 <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
             </a>

             <div className="h-8 w-[2px] bg-gray-200 mx-1 hidden sm:block"></div>

            <SignedOut>
                <SignInButton mode="modal">
                    <button className={authBtn}>
                        Sign In
                    </button>
                </SignInButton>
            </SignedOut>
            <SignedIn>
                <div className="border-2 border-black rounded-full p-0.5 hover:shadow-[0px_0px_0px_4px_rgba(253,224,71,0.5)] transition-all bg-white">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
                </div>
            </SignedIn>
         </div>
      </header>
      
      {/* Tabs / Sub-header */}
      <div className="w-full bg-white border-b-2 border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-center sm:justify-start gap-4 overflow-x-auto no-scrollbar">
           <button 
            onClick={() => onTabChange('featured')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all whitespace-nowrap ${activeTab === 'featured' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(100,100,100,0.5)]' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
           >
             Featured 🌟
           </button>
           <button 
            onClick={() => onTabChange('latest')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all whitespace-nowrap ${activeTab === 'latest' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(100,100,100,0.5)]' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
           >
             Fresh In 🚀
           </button>
           <SignedIn>
               <button 
                onClick={() => onTabChange('personal')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'personal' ? 'bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(100,100,100,0.5)]' : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'}`}
               >
                 <span>My Popku</span>
                 <span className="bg-pink-500 text-white text-[10px] px-1.5 rounded-full">YOU</span>
               </button>
           </SignedIn>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white relative z-0">
          
          {activeTab === 'personal' && isViewingOther && (
            <div className="mb-6 flex items-center gap-3 bg-gray-50 p-4 rounded-xl border-2 border-black max-w-7xl mx-auto">
                 <button onClick={() => onTabChange('featured')} className="text-sm font-bold underline">← Back to Feed</button>
                 <span className="text-gray-400">|</span>
                 <span className="font-bold">Viewing Profile: {shares[0]?.authorName || 'User'}</span>
            </div>
          )}

          {isFeedLoading ? (
             <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-black border-t-pink-500 rounded-full animate-spin"></div>
             </div>
          ) : (feedError || error) ? (
             <div className="text-center py-10 bg-gray-50 border-2 border-black rounded-xl max-w-md mx-auto">
                <p className="text-lg font-bold">Failed to load</p>
                <p className="text-sm text-red-500">{feedError || error}</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pb-20">
                {shares.length > 0 ? (
                    shares.map(item => (
                        <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} onUserClick={onUserClick} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl">
                        <p className="text-2xl font-black text-gray-300">Nothing here yet!</p>
                        <p className="text-gray-400 mt-2">
                           {activeTab === 'personal' ? "You haven't shared anything yet." : "Be the first to create something awesome."}
                        </p>
                    </div>
                )}
            </div>
          )}
      </main>

      {/* Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUploadForm(false)}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-6 w-full max-w-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black">Upload Creation</h2>
                <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Prompt / Title</label>
                        <input 
                            type="text" 
                            className="w-full border-2 border-black rounded-lg px-3 py-2 font-bold"
                            value={uploadPrompt}
                            onChange={e => setUploadPrompt(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">HTML File</label>
                        <input 
                            type="file" 
                            accept=".html"
                            className="w-full border-2 border-black rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
                            onChange={e => setHtmlFile(e.target.files?.[0] || null)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Screenshot (JPEG/PNG)</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            className="w-full border-2 border-black rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
                            onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                         <button type="button" onClick={() => setShowUploadForm(false)} className="px-4 py-2 border-2 border-black rounded-lg font-bold hover:bg-gray-100">Cancel</button>
                         <button type="submit" className={primaryBtn}>Upload</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* WeChat Modal */}
      {showWeChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWeChatModal(false)}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-sm flex flex-col gap-4 items-center text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black">Join Community</h2>
                <p className="font-medium text-gray-600">Scan via WeChat to join our group!</p>
                <div className="w-48 h-48 bg-gray-200 rounded-xl overflow-hidden border-2 border-black">
                    <img src="/wechat.png" alt="WeChat QR Code" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => setShowWeChatModal(false)} className="mt-2 px-6 py-2 border-2 border-black rounded-xl font-bold hover:bg-gray-100 w-full">
                    Close
                </button>
            </div>
        </div>
      )}
    </div>
  );
};