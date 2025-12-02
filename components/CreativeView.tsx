







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
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopyButtonText, setPromptCopyButtonText] = useState('Copy');
  
  const [pendingShare, setPendingShare] = useState(false);

  const { openSignIn } = useClerk();

  useEffect(() => {
    if (initialShareUrl) {
      setShareUrl(initialShareUrl);
      setShowShareModal(true);
    }
  }, [initialShareUrl]);
  
  const handleShareClick = async () => {
    if (!userId) {
        setPendingShare(true);
        openSignIn();
        return;
    }

    setShowShareModal(true);
    if (shareUrl || isSharing) return;

    setIsSharing(true);
    setShareError(null);
    setCopyButtonText('Copy');
    setScreenshotUrl(null);

    try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe?.contentWindow?.document;

        if (!iframeDoc?.body) {
            throw new Error("Could not access content.");
        }

        const screenshotCanvas = await html2canvas(iframeDoc.body, { 
            useCORS: true, 
            backgroundColor: '#fffbeb',
            logging: false,
            allowTaint: true, 
          });
        
        const screenshotDataUrl = screenshotCanvas ? screenshotCanvas.toDataURL('image/jpeg', 0.9) : null;
        setScreenshotUrl(screenshotDataUrl);

        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              html, 
              prompt,
              type: 'create',
              screenshot: screenshotDataUrl,
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

  useEffect(() => {
    if (userId && pendingShare) {
        setPendingShare(false);
        handleShareClick();
    }
  }, [userId, pendingShare]);

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareUrl(null);
    setShareError(null);
    setIsSharing(false);
    setScreenshotUrl(null);
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
            sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black text-black">Share It!</h2>
                {isSharing && (
                    <div className="flex flex-col items-center justify-center gap-4 p-4 text-lg font-bold text-gray-600">
                        <div className="w-full aspect-video bg-gray-100 border-2 border-black rounded-lg flex items-center justify-center animate-pulse">
                            📸 Snapping...
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <LoadingSpinnerInline />
                            <span>Creating your link...</span>
                        </div>
                    </div>
                )}
                {shareError && (
                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl font-bold">
                        <p>Oops! {shareError}</p>
                    </div>
                )}
                {!isSharing && shareUrl && (
                     <div className="flex flex-col gap-4">
                        {screenshotUrl && (
                          <div className="border-2 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
                            <img src={screenshotUrl} alt="Screenshot" className="w-full h-auto object-contain" />
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