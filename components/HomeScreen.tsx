
import React, { useState, useEffect, useRef } from 'react';
import type { CommunityShare } from '../types.js';
import type { FeedTab } from '../App.js';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

interface HomeScreenProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  userId?: string;
  onUnifiedSubmit: (input: string) => void;
  onFileUpload: (htmlContent: string, prompt: string, screenshotDataUrl: string) => void;
  onLoadBlobConcept: (blobUrl: string) => void;
  isLoading: boolean;
  error: string | null;
}

const CommunityCard: React.FC<{ item: CommunityShare, onClick: () => void }> = ({ item, onClick }) => (
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

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  activeTab,
  onTabChange,
  userId,
  onUnifiedSubmit,
  onFileUpload,
  onLoadBlobConcept,
  isLoading, 
  error,
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

  // Fetch community shares or user creations when tab changes
  useEffect(() => {
    const fetchShares = async () => {
      setIsFeedLoading(true);
      setFeedError(null);
      try {
        let endpoint = `/api/community?filter=${activeTab}`;
        
        if (activeTab === 'personal') {
            if (!userId) {
                // Should not happen if UI is correct, but safe fallback
                setShares([]);
                setIsFeedLoading(false);
                return;
            }
            endpoint = `/api/user-creations?userId=${userId}`;
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
  }, [activeTab, userId]);

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
                     className="w-full h-12 rounded-full border-2 border-black px-6 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all bg-white hover:bg-gray-50 placeholder-gray-400"
                     placeholder="Search or type to create..."
                     disabled={isLoading}
                 />
                 <button type="submit" className="absolute right-2 top-1.5 bg-black text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors" disabled={isLoading}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                     </svg>
                 </button>
             </form>

             {/* Omni-box Dropdown */}
             {showDropdown && inputValue.trim().length > 1 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-10 flex flex-col animate-fade-in-up">
                    {filteredShares.length > 0 && (
                        <div className="flex flex-col border-b-2 border-black">
                             <div className="px-4 py-2 bg-gray-50 border-b-2 border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Found in Gallery
                             </div>
                             {filteredShares.map(share => (
                                <a 
                                    key={share.id}
                                    href={`/view/${share.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.history.pushState({}, '', `/view/${share.id}`);
                                        // Trigger count but don't wait
                                        fetch(`/api/item?id=${share.id}`).catch(() => {});
                                        handleExistingSelect(share.blobUrl);
                                    }}
                                    className="text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-0"
                                >
                                     <div className="w-10 h-8 bg-gray-200 rounded border border-black overflow-hidden flex-shrink-0">
                                        {share.screenshotUrl ? <img src={share.screenshotUrl} alt="" className="w-full h-full object-cover" /> : null}
                                     </div>
                                     <div className="flex-grow min-w-0">
                                        <p className="text-sm font-bold text-black truncate">{share.prompt}</p>
                                        <p className="text-xs text-gray-500">{new Date(share.createdAt).toLocaleDateString()}</p>
                                     </div>
                                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-black flex-shrink-0 ${share.type === 'learn' ? 'bg-pink-300' : 'bg-lime-300'}`}>
                                        {share.type === 'learn' ? 'LEARN' : 'APP'}
                                     </span>
                                </a>
                             ))}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => {
                            onUnifiedSubmit(inputValue);
                            setShowDropdown(false);
                        }}
                        className="text-left px-4 py-4 hover:bg-gray-50 flex items-center gap-3 text-black group"
                    >
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                             </svg>
                        </div>
                        <div>
                            <p className="font-bold text-sm">Generate New</p>
                            <p className="text-xs text-gray-500">Create a brand new concept for "{inputValue}"</p>
                        </div>
                    </button>
                </div>
             )}
         </div>

         {/* Right: Social/Nav, Upload & Auth */}
         <div className="flex-shrink-0 lg:flex-1 lg:flex lg:justify-end items-center gap-3">
             <div className="flex items-center gap-2">
                {/* Slot 1: WeChat (Logged Out only) */}
                <SignedOut>
                    <button 
                        onClick={() => setShowWeChatModal(true)}
                        className={`${socialBtn} text-green-600`}
                        title="WeChat Group"
                    >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.03 2 11C2 13.974 3.582 16.618 6.052 18.23C5.783 19.467 5.167 21.096 4.025 21.98C6.397 21.98 8.435 20.84 9.94 19.535C10.603 19.645 11.29 19.704 12 19.704C17.523 19.704 22 15.674 22 10.704C22 5.733 17.523 2 12 2Z" fill="#07C160"/>
                            <circle cx="8.5" cy="9.5" r="1.5" fill="white"/>
                            <circle cx="15.5" cy="9.5" r="1.5" fill="white"/>
                        </svg>
                    </button>
                </SignedOut>

                {/* Slot 2: Discord (Logged Out only) */}
                <SignedOut>
                    <a 
                        href="https://discord.com/invite/x4am4gaRZY" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${socialBtn} text-[#5865F2]`}
                        title="Join Discord"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.486 13.486 0 0 0-.59 1.227 18.312 18.312 0 0 0-5.552 0 13.486 13.486 0 0 0-.59-1.227.074.074 0 0 0-.079-.037A19.736 19.736 0 0 0 3.673 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.074.074 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                    </a>
                </SignedOut>
             </div>

            {/* Slot 3: Upload Button */}
            <button 
                onClick={() => setShowUploadForm(true)} 
                className="flex items-center gap-2 bg-pink-300 border-2 border-black px-4 py-2 rounded-xl font-bold text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-400 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all active:shadow-none active:translate-y-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <span className="hidden md:inline">Upload</span>
            </button>

            {/* Slot 4: Auth (Sign In / User Button) */}
            <SignedOut>
                <SignInButton mode="modal">
                    <button className={authBtn}>
                        Sign In
                    </button>
                </SignInButton>
            </SignedOut>
            <SignedIn>
                <div className="flex items-center justify-center border-2 border-black rounded-full overflow-hidden w-9 h-9 shadow-[2px_2px_0px_0px_black]">
                    <UserButton />
                </div>
            </SignedIn>

         </div>
      </header>

      {/* Main Content: Community Grid */}
      <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white relative z-0">
          {/* Global Error Display */}
          {error && (
            <div className="w-full max-w-3xl mx-auto mb-8 animate-bounce">
                <div className="bg-red-100 border-2 border-red-500 text-red-600 p-4 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    {error}
                </div>
            </div>
          )}

          {/* Unified Feed Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white border-2 border-black p-1 rounded-2xl flex items-center space-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-x-auto max-w-full">
                <SignedIn>
                     <button 
                        onClick={() => onTabChange('personal')}
                        className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all border-2 border-transparent flex items-center gap-2 whitespace-nowrap ${activeTab === 'personal' ? 'bg-pink-300 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <span>👤</span> My Popku
                    </button>
                </SignedIn>
                <button 
                    onClick={() => onTabChange('featured')}
                    className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all border-2 border-transparent flex items-center gap-2 whitespace-nowrap ${activeTab === 'featured' ? 'bg-yellow-300 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <span>✨</span> Featured
                </button>
                <button 
                    onClick={() => onTabChange('latest')}
                    className={`px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition-all border-2 border-transparent flex items-center gap-2 whitespace-nowrap ${activeTab === 'latest' ? 'bg-cyan-300 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <span>🔥</span> Latest
                </button>
            </div>
          </div>

          {/* Feed Content */}
          {isFeedLoading ? (
             <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-black border-t-pink-500 rounded-full animate-spin"></div>
             </div>
          ) : feedError ? (
             <div className="text-center py-10 bg-gray-50 border-2 border-black rounded-xl max-w-md mx-auto">
                <p className="text-lg font-bold">Failed to load feed</p>
                <button onClick={() => window.location.reload()} className="mt-2 text-pink-500 font-bold underline">Retry</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {shares.length > 0 ? (
                    shares.map(item => (
                        <CommunityCard key={item.id} item={item} onClick={() => onLoadBlobConcept(item.blobUrl)} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl">
                        <p className="text-2xl font-black text-gray-300">Nothing here yet!</p>
                        <p className="text-gray-400 mt-2">
                           {activeTab === 'featured' ? "Check back later for curated picks." : activeTab === 'personal' ? "You haven't created anything yet." : "Be the first to create something."}
                        </p>
                    </div>
                )}
            </div>
          )}
      </main>

      {/* Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUploadForm(false)}>
            <form onSubmit={handleUploadSubmit} onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-6 flex flex-col gap-4 relative animate-fade-in">
                <button type="button" onClick={() => setShowUploadForm(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border-2 border-black hover:bg-red-100 font-bold">✕</button>
                <h3 className="text-2xl font-black text-black text-center mt-2">Upload Creation</h3>
                
                <div>
                    <label className="block text-sm font-bold text-black mb-2 text-left">Prompt / Description*</label>
                    <textarea 
                        value={uploadPrompt}
                        onChange={(e) => setUploadPrompt(e.target.value)}
                        className="w-full h-24 p-3 rounded-lg border-2 border-black resize-none focus:outline-none focus:ring-4 focus:ring-pink-200"
                        placeholder="What is this app? e.g., 'A classic Snake game with neon graphics'"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2 text-left">HTML File*</label>
                    <div className="flex items-center gap-3">
                    <label htmlFor="html-upload" className="cursor-pointer py-2 px-4 rounded-lg border-2 border-black text-sm font-bold bg-yellow-300 text-black hover:bg-yellow-400 hover:-translate-y-0.5 transition-all shrink-0 shadow-[2px_2px_0px_0px_#000]">
                        Choose File
                    </label>
                    <input
                        id="html-upload"
                        type="file"
                        onChange={(e) => setHtmlFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept="text/html,.html"
                        required
                    />
                    <span className="text-sm font-medium text-gray-600 truncate bg-gray-100 px-3 py-2 rounded-lg border-2 border-gray-200 flex-grow">
                        {htmlFile ? htmlFile.name : 'No file chosen'}
                    </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2 text-left">Screenshot*</label>
                    <div className="flex items-center gap-3">
                    <label htmlFor="screenshot-upload" className="cursor-pointer py-2 px-4 rounded-lg border-2 border-black text-sm font-bold bg-cyan-300 text-black hover:bg-cyan-400 hover:-translate-y-0.5 transition-all shrink-0 shadow-[2px_2px_0px_0px_#000]">
                        Choose File
                    </label>
                    <input
                        id="screenshot-upload"
                        type="file"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept="image/*"
                        required
                    />
                        <span className="text-sm font-medium text-gray-600 truncate bg-gray-100 px-3 py-2 rounded-lg border-2 border-gray-200 flex-grow">
                        {screenshotFile ? screenshotFile.name : 'No file chosen'}
                    </span>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                    type="submit"
                    disabled={!htmlFile || !screenshotFile || !uploadPrompt.trim() || isLoading}
                    className={primaryBtn + " w-full text-lg py-3"}
                    >
                    Upload & Share
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* WeChat Modal */}
      {showWeChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWeChatModal(false)}>
            <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-3xl p-8 max-w-sm w-full relative text-center" onClick={e => e.stopPropagation()}>
                 <button onClick={() => setShowWeChatModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border-2 border-black hover:bg-gray-100 font-bold">✕</button>
                 <h3 className="text-xl font-black mb-4">群聊：Popku</h3>
                 <div className="w-48 h-48 mx-auto bg-gray-200 border-2 border-black rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                    <img 
                        src="https://lksz5l2aw9u3i96n.public.blob.vercel-storage.com/WECHAT/wechat.png" 
                        alt="WeChat QR Code" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none'; 
                            target.parentElement!.innerHTML = '<span class="text-xs text-gray-400 p-4 text-center">QR Code not found<br/>(Check file location)</span>';
                        }}
                    />
                 </div>
                 <p className="text-sm text-gray-500 font-bold">该二维码7天内(12月3日前)有效，重新进入将更新</p>
            </div>
        </div>
      )}
    </div>
  );
};
