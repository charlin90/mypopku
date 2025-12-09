
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2canvas from 'html2canvas';
import { useClerk } from '@clerk/clerk-react';

interface CreativeViewProps {
  html: string;
  prompt: string;
  onBack: () => void;
  initialShareUrl?: string | null;
  onClearInitialShareUrl: () => void;
  userId?: string | null;
  userName?: string;
  userAvatarUrl?: string;
}

const LoadingSpinnerInline: React.FC = () => (
    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
);


export const CreativeView: React.FC<CreativeViewProps> = ({ html, prompt, onBack, initialShareUrl, onClearInitialShareUrl, userId, userName, userAvatarUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [customScreenshot, setCustomScreenshot] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopyButtonText, setPromptCopyButtonText] = useState('Copy');
  
  const { openSignIn } = useClerk();

  useEffect(() => {
    if (initialShareUrl) {
      setShareUrl(initialShareUrl);
      setShowShareModal(true);
    }
  }, [initialShareUrl]);
  
  const handleShareClick = async () => {
    // If user is not logged in, trigger sign in modal and set pending flag in session storage
    if (!userId) {
        console.log('[CreativeView] User not logged in. Saving state and setting pending flag.');
        sessionStorage.setItem('restore_state', JSON.stringify({
            view: 'creativeView',
            html,
            prompt
        }));
        sessionStorage.setItem('pending_share_creative', 'true');
        openSignIn();
        return;
    }

    setShowShareModal(true);
    if (shareUrl) return;

    setIsCapturing(true);
    setShareError(null);
    setCopyButtonText('Copy');
    setScreenshotUrl(null);
    setCustomScreenshot(null);

    try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe?.contentWindow?.document;

        if (!iframeDoc?.body) {
            throw new Error("Could not access content.");
        }

        // Slight delay to ensure modal render doesn't glitch capture
        await new Promise(resolve => setTimeout(resolve, 100));

        const screenshotCanvas = await html2canvas(iframeDoc.body, { 
            useCORS: true, 
            backgroundColor: '#fffbeb',
            logging: false,
            allowTaint: true, 
          });
        
        const screenshotDataUrl = screenshotCanvas ? screenshotCanvas.toDataURL('image/jpeg', 0.9) : null;
        setScreenshotUrl(screenshotDataUrl);
    } catch (err) {
        console.error("Screenshot failed:", err);
        setShareError("Failed to capture screenshot automatically. You can upload one manually.");
    } finally {
        setIsCapturing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
        setIsSharing(true);
        setShareError(null);
        
        try {
            const response = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                html, 
                prompt,
                type: 'create',
                screenshot: customScreenshot || screenshotUrl,
                userId: userId,
                authorName: userName,
                authorAvatarUrl: userAvatarUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create share link.');
            }

            const data = await response.json();
            setShareUrl(data.url);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setShareError(message);
        } finally {
            setIsSharing(false);
        }
  };

  // Automatically trigger share if pending share flag exists in sessionStorage and user logs in
  useEffect(() => {
    const isPending = sessionStorage.getItem('pending_share_creative') === 'true';
    console.log('[CreativeView] Checking auto-share', { userId, isPending });
    
    if (userId && isPending) {
        console.log('[CreativeView] Triggering auto-share logic...');
        sessionStorage.removeItem('pending_share_creative');
        handleShareClick();
    }
  }, [userId]);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    // Preserve shareUrl for subsequent opens, but reset active states
    setIsSharing(false);
    setIsCapturing(false);
    
    if (initialShareUrl) {
      onClearInitialShareUrl();
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopyButtonText('Copied!');
    setTimeout(() => setPromptCopyButtonText('Copy'), 2000);
  };
  
  const btnStyle = "bg-white border-2 border-black text-black font-bold py-2 px-4 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all";

  return (
    <>
      <div className="w-full h-full bg-amber-50 relative">
        <div className="absolute top-4 left-4 flex gap-4 z-20">
            <button onClick={onBack} className={btnStyle}>Back</button>
            <button onClick={handleShareClick} className={btnStyle}>Share</button>
            <button onClick={() => setShowPromptModal(true)} className={btnStyle}>Prompt</button>
        </div>
        <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Generated AI Content"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-modals"
        />
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-md flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black text-black">Share It!</h2>
                
                {/* State 1: Capturing */}
                {isCapturing && (
                    <div className="flex flex-col items-center justify-center gap-4 p-4 text-lg font-bold text-gray-600">
                        <div className="w-full aspect-video bg-gray-100 border-2 border-black rounded-lg flex items-center justify-center animate-pulse">
                            📸 Snapping...
                        </div>
                    </div>
                )}
                
                {/* State 2: Preview & Confirm */}
                {!isCapturing && !isSharing && !shareUrl && (
                     <div className="flex flex-col gap-4">
                        <div className="relative border-2 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-100 aspect-video group">
                            {customScreenshot || screenshotUrl ? (
                                <img src={customScreenshot || screenshotUrl!} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Preview</div>
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold">
                                <span>Change Cover 📷</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-gray-500 font-bold">
                            <span>Preview</span>
                            <label className="cursor-pointer text-teal-600 hover:underline">
                                Upload Custom Image
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>

                        <button 
                            onClick={handlePublish} 
                            className="bg-black text-white border-2 border-black font-bold py-3 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all mt-2"
                        >
                            Confirm & Publish
                        </button>
                    </div>
                )}

                {/* State 3: Uploading */}
                {isSharing && (
                    <div className="flex flex-col items-center justify-center gap-4 p-4 text-lg font-bold text-gray-600">
                        <div className="flex items-center gap-3 mt-2">
                            <LoadingSpinnerInline />
                            <span>Creating your link...</span>
                        </div>
                    </div>
                )}

                {/* Error */}
                {shareError && (
                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl font-bold">
                        <p>Oops! {shareError}</p>
                    </div>
                )}
                
                {/* State 4: Success */}
                {!isSharing && shareUrl && (
                     <div className="flex flex-col gap-4">
                        {(customScreenshot || screenshotUrl) && (
                          <div className="border-2 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1 aspect-video">
                            <img src={customScreenshot || screenshotUrl!} alt="Screenshot" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-black font-medium">Here is your magic link:</p>
                        <div className="flex items-center gap-2">
                            <input type="text" readOnly value={shareUrl} className="w-full px-4 py-3 text-black bg-gray-50 border-2 border-black rounded-xl font-mono focus:outline-none focus:ring-4 focus:ring-pink-200" />
                            <button onClick={handleCopy} className="bg-teal-300 border-2 border-black text-black font-bold py-3 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex-shrink-0 w-24">
                                {copyButtonText}
                            </button>
                        </div>
                    </div>
                )}
                 <button onClick={closeShareModal} className="mt-2 bg-gray-200 hover:bg-gray-300 text-black border-2 border-black font-bold py-2 px-6 rounded-xl self-end">
                    Close
                </button>
            </div>
        </div>
      )}

      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPromptModal(false)}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black text-black">The Secret Recipe 🤫</h2>
                <div className="bg-gray-50 border-2 border-black rounded-xl p-4 text-gray-800 max-h-96 overflow-y-auto font-mono text-sm shadow-inner">
                    <p className="whitespace-pre-wrap">{prompt}</p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={handleCopyPrompt} className="bg-lime-300 hover:bg-lime-400 border-2 border-black text-black font-bold py-2 px-4 rounded-xl shadow-[3px_3px_0px_0px_black] transition-all w-28">
                        {promptCopyButtonText}
                    </button>
                    <button onClick={() => setShowPromptModal(false)} className="bg-gray-200 hover:bg-gray-300 border-2 border-black text-black font-bold py-2 px-6 rounded-xl">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
