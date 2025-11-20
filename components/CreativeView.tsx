import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2canvas from 'html2canvas';

interface CreativeViewProps {
  html: string;
  prompt: string;
  onBack: () => void;
  initialShareUrl?: string | null;
  onClearInitialShareUrl: () => void;
}

const LoadingSpinnerInline: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-teal-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const CreativeView: React.FC<CreativeViewProps> = ({ html, prompt, onBack, initialShareUrl, onClearInitialShareUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopyButtonText, setPromptCopyButtonText] = useState('Copy');
  
  useEffect(() => {
    if (initialShareUrl) {
      setShareUrl(initialShareUrl);
      setShowShareModal(true);
    }
  }, [initialShareUrl]);
  
  const handleShareClick = async () => {
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
            throw new Error("Could not access the content of the experiment to take a screenshot.");
        }

        const screenshotCanvas = await html2canvas(iframeDoc.body, { 
            useCORS: true, 
            backgroundColor: '#111827',
            logging: false,
            // Allow iframes to be captured. Works for srcDoc.
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
  
  return (
    <>
      <div className="w-full h-screen bg-gray-900 relative">
        <div className="absolute top-4 left-4 flex gap-4 z-10">
            <button
                onClick={onBack}
                className="text-white text-sm opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Go back"
            >
                Back
            </button>
            <button 
                onClick={handleShareClick} 
                className="text-white text-sm opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Share experiment"
            >
                Share
            </button>
            <button 
                onClick={() => setShowPromptModal(true)} 
                className="text-white text-sm opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Show prompt"
            >
                Prompt
            </button>
        </div>
        <main className="w-full h-full">
            <iframe
                ref={iframeRef}
                srcDoc={html}
                title="Generated AI Content"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
            />
        </main>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white">Share Experiment</h2>
                {isSharing && (
                    <div className="flex flex-col items-center justify-center gap-4 p-4 text-lg text-gray-300">
                        <div className="w-full aspect-video bg-gray-700/50 rounded-lg flex items-center justify-center animate-pulse">
                            <svg className="w-10 h-10 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <LoadingSpinnerInline />
                            <span>Generating preview & link...</span>
                        </div>
                    </div>
                )}
                {shareError && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
                        <p className="font-bold">Could not create link</p>
                        <p className="text-sm mt-1">{shareError}</p>
                    </div>
                )}
                {!isSharing && shareUrl && (
                     <div className="flex flex-col gap-3">
                        {screenshotUrl && (
                          <div className="border border-gray-700 rounded-lg overflow-hidden shadow-lg">
                            <img src={screenshotUrl} alt="A screenshot of the interactive experiment" className="w-full h-auto object-contain" />
                          </div>
                        )}
                        <p className="text-gray-400 text-sm">Your unique link is ready. Sharing will add your creation to the public community page.</p>
                        <div className="flex items-center gap-2">
                            <input type="text" readOnly value={shareUrl} className="w-full px-4 py-2 text-gray-100 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            <button onClick={handleCopy} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 text-center flex-shrink-0">
                                {copyButtonText}
                            </button>
                        </div>
                    </div>
                )}
                 <button onClick={closeShareModal} className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors self-end">
                    Close
                </button>
            </div>
        </div>
      )}

      {showPromptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPromptModal(false)}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white">Generation Prompt</h2>
                <div className="bg-gray-900 border border-gray-700 rounded-md p-4 text-gray-300 max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{prompt}</p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={handleCopyPrompt} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 text-center">
                        {promptCopyButtonText}
                    </button>
                    <button onClick={() => setShowPromptModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};