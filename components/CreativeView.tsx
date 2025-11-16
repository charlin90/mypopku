
import React, { useState, useEffect } from 'react';

interface CreativeViewProps {
  html: string;
  prompt: string;
  onBack: () => void;
}

const LoadingSpinnerInline: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-teal-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const CreativeView: React.FC<CreativeViewProps> = ({ html, prompt, onBack }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopyButtonText, setPromptCopyButtonText] = useState('Copy');
  
  // Auto-save the generated content when the component mounts.
  useEffect(() => {
    if (html && prompt) {
      // This is a "fire and forget" operation. We don't block the UI.
      // We'll log the outcome to the console for debugging.
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, prompt }),
      })
      .then(async (response) => {
        if (response.ok) {
          console.log('Creative experiment auto-saved successfully.');
        } else {
          const errorData = await response.json().catch(() => ({ details: 'Could not parse error JSON.' }));
          console.error('Failed to auto-save creative experiment:', errorData.details || 'Unknown server error');
        }
      })
      .catch((error) => {
        console.error('Network error while auto-saving creative experiment:', error);
      });
    }
  }, [html, prompt]);
  
  const handleShareClick = async () => {
    setShowShareModal(true);
    if (shareUrl || isSharing) return;

    setIsSharing(true);
    setShareError(null);
    setCopyButtonText('Copy');

    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html, prompt }),
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
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopyButtonText('Copied!');
    setTimeout(() => setPromptCopyButtonText('Copy'), 2000);
  };
  
  return (
    <>
      <div className="w-full h-full bg-gray-900 relative">
        <div className="absolute top-7 left-7 flex gap-3 z-20">
          <button
            onClick={onBack}
            className="w-12 h-12 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-2xl hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            ←
          </button>
          <button 
                onClick={handleShareClick} 
                className="h-12 px-6 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                aria-label="Share experiment"
            >
                Share
            </button>
            <button 
                onClick={() => setShowPromptModal(true)} 
                className="h-12 px-6 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                aria-label="Show prompt"
            >
                Prompt
            </button>
        </div>
        <iframe
          srcDoc={html}
          title="Generated AI Content"
          className="w-full h-full border-none"
          sandbox="allow-scripts"
        />
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white">Share Experiment</h2>
                {isSharing && (
                    <div className="flex items-center justify-center gap-3 p-4 text-lg text-gray-300">
                        <LoadingSpinnerInline />
                        <span>Generating shareable link...</span>
                    </div>
                )}
                {shareError && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
                        <p className="font-bold">Could not create link</p>
                        <p className="text-sm mt-1">{shareError}</p>
                    </div>
                )}
                {shareUrl && (
                    <div className="flex flex-col gap-2">
                        <p className="text-gray-400">Your unique link is ready. Anyone with this link can view the experiment.</p>
                        <div className="flex items-center gap-2 mt-2">
                            <input type="text" readOnly value={shareUrl} className="w-full px-4 py-2 text-gray-100 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            <button onClick={handleCopy} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 text-center">
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
