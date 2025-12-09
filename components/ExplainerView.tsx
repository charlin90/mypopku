
import React, { useEffect, useRef, useState } from 'react';
import type { GeneratedConcept } from '../types.js';
import { marked, type Tokens } from 'marked';
// @ts-ignore
import html2canvas from 'html2canvas';
import { useClerk } from '@clerk/clerk-react';

interface ExplainerViewProps {
  content: GeneratedConcept;
  prompt: string;
  onBack: () => void;
  userId?: string | null;
  userName?: string;
  userAvatarUrl?: string;
}

const LoadingSpinnerInline: React.FC = () => (
    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
);


const renderer = new marked.Renderer();
renderer.heading = (token: Tokens.Heading) => {
  return `<h${token.depth}>${token.text}</h${token.depth}>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

export const ExplainerView: React.FC<ExplainerViewProps> = ({ content, prompt, onBack, userId, userName, userAvatarUrl }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [initialHtml, setInitialHtml] = useState('');

  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [customScreenshot, setCustomScreenshot] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  
  const [hasClickedAha, setHasClickedAha] = useState(false);
  const [panelPulsing, setPanelPulsing] = useState(false);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopyButtonText, setPromptCopyButtonText] = useState('Copy');
  
  // New state for collapsible navigation
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  
  const { openSignIn } = useClerk();

  const handleAhaClick = () => {
    if (hasClickedAha) return;
    setHasClickedAha(true);
    setPanelPulsing(true);
    setTimeout(() => setPanelPulsing(false), 700);
  };

  const handleShareClick = async () => {
    // If user is not logged in, trigger sign in modal and set pending flag in session storage
    if (!userId) {
        console.log('[ExplainerView] User not logged in. Saving state and setting pending flag.');
        sessionStorage.setItem('restore_state', JSON.stringify({
            view: 'explainer',
            content,
            prompt
        }));
        sessionStorage.setItem('pending_share_explainer', 'true');
        openSignIn();
        return;
    }

    setShowShareModal(true);
    if (shareUrl) return; // Already shared

    // Start Capture Process
    setIsCapturing(true);
    setShareError(null);
    setCopyButtonText('Copy');
    setScreenshotUrl(null);
    setCustomScreenshot(null);

    try {
        // Wait a tiny bit for the modal to render (though it shouldn't block the canvas capture of the underlying view)
        await new Promise(resolve => setTimeout(resolve, 100));

        const screenshotCanvas = viewRef.current
            ? await html2canvas(viewRef.current, { 
                useCORS: true, 
                backgroundColor: '#fffbeb', // Match app background (amber-50)
                logging: false, 
              })
            : null;
        
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
                ...content, 
                prompt,
                type: 'learn',
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
    const isPending = sessionStorage.getItem('pending_share_explainer') === 'true';
    console.log('[ExplainerView] Checking auto-share', { userId, isPending });
    
    if (userId && isPending) {
        console.log('[ExplainerView] Triggering auto-share logic...');
        sessionStorage.removeItem('pending_share_explainer');
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
    // We do NOT clear shareUrl here so if they open it again, it's still there.
    // But we reset loading states.
    setIsSharing(false);
    setIsCapturing(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopyButtonText('Copied!');
    setTimeout(() => setPromptCopyButtonText('Copy'), 2000);
  };


  useEffect(() => {
    if (content.explanation) {
      (async () => {
        try {
          const parsedHtml = await marked.parse(content.explanation);
          setInitialHtml(parsedHtml as string);
        } catch (error) {
          setInitialHtml("<p>Error loading explanation.</p>");
        }
      })();
    } else {
      setInitialHtml('');
    }
  }, [content.explanation]);


  useEffect(() => {
    if (!content) return;

    if (!document.head || !document.body) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-concept-styles';
    styleElement.innerHTML = content.css;
    document.head.appendChild(styleElement);

    let libraryScriptElement: HTMLScriptElement | null = null;
    let scriptRunnerTimeoutId: number | undefined;

    const runAiScript = () => {
      if (content.js) {
        try {
          const runScript = new Function(`
            try {
              ${content.js}
            } catch(e) {
              console.error('Error executing dynamic concept script:', e);
            }
          `);
          scriptRunnerTimeoutId = window.setTimeout(runScript, 100);
        } catch (e) {
          console.error("Syntax error in AI-generated JavaScript:", e);
        }
      }
    };

    if (content.libraryUrl) {
      libraryScriptElement = document.createElement('script');
      libraryScriptElement.id = 'dynamic-concept-library';
      libraryScriptElement.src = content.libraryUrl;
      libraryScriptElement.async = true; 
      libraryScriptElement.onload = () => {
        runAiScript();
      };
      document.body.appendChild(libraryScriptElement);
    } else {
      runAiScript();
    }

    return () => {
      const style = document.getElementById('dynamic-concept-styles');
      if (style) style.remove();
      if (libraryScriptElement) libraryScriptElement.remove();
      if (scriptRunnerTimeoutId) clearTimeout(scriptRunnerTimeoutId);
    };
  }, [content]);

  const buttonStyle = "bg-white border-2 border-black text-black font-bold py-2 px-4 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all";

  return (
    <>
       <style>{`
        @keyframes pulse-border {
            0% { box-shadow: 4px 4px 0px 0px #000; border-color: #000; }
            50% { box-shadow: 0 0 0 8px rgba(253, 224, 71, 0.5); border-color: #000; } 
            100% { box-shadow: 4px 4px 0px 0px #000; border-color: #000; }
        }
        .pulse-border-animation {
            animation: pulse-border 0.5s ease-out;
        }

        @keyframes fly-out {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; }
        }
        .particle {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 8px;
            height: 8px;
            background-color: #f472b6; 
            border: 1px solid black;
            border-radius: 50%;
            animation: fly-out var(--d, 0.5s) ease-out forwards;
        }
       `}</style>
      <div ref={viewRef} className="fixed top-0 left-0 w-full h-full p-2 sm:p-5 grid grid-cols-1 grid-rows-[minmax(0,_2fr)_minmax(0,_1fr)] lg:grid-cols-3 lg:grid-rows-1 gap-4 box-border bg-amber-50">
        
        {/* Navigation Controls */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
             {isNavExpanded && (
                <div className="flex gap-3">
                    <button onClick={onBack} className={buttonStyle} aria-label="Go back">
                        Back
                    </button>
                    <button onClick={handleShareClick} className={buttonStyle} aria-label="Share experiment">
                        Share
                    </button>
                    <button onClick={() => setShowPromptModal(true)} className={buttonStyle} aria-label="Show prompt">
                        Prompt
                    </button>
                </div>
            )}
            <button
                onClick={() => setIsNavExpanded(!isNavExpanded)}
                className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-0.5 hover:shadow-none ${!isNavExpanded ? 'opacity-50 hover:opacity-100' : ''}`}
                aria-label={isNavExpanded ? "Collapse menu" : "Expand menu"}
            >
                {isNavExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                )}
            </button>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-white rounded-3xl relative overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black">
          <div 
            id="interactive-stage"
            ref={stageRef}
            className="w-full min-h-full flex items-center justify-center p-4 sm:p-8 box-border"
            dangerouslySetInnerHTML={{ __html: content.html }}
          ></div>
        </div>
        
        <div className="relative col-span-1 flex flex-col h-full overflow-hidden">
          <div 
            id="explanation-panel"
            ref={panelRef}
            className={`flex-grow bg-white border-4 border-black rounded-3xl p-6 overflow-y-auto prose prose-neutral text-lg leading-relaxed text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${panelPulsing ? 'pulse-border-animation bg-yellow-50' : ''}`}
            dangerouslySetInnerHTML={{ __html: initialHtml }}
          >
          </div>
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-auto flex justify-center z-20">
                <button
                    onClick={handleAhaClick}
                    disabled={hasClickedAha}
                    className={`relative overflow-hidden flex items-center justify-center gap-2 w-48 h-14 rounded-2xl font-black text-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${hasClickedAha
                            ? 'bg-yellow-300 text-black cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[4px] translate-y-[4px]'
                            : 'bg-white text-black hover:bg-yellow-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
                        }`}
                >
                    {hasClickedAha && Array.from({ length: 15 }).map((_, i) => {
                        const angle = Math.random() * 360;
                        const distance = 50 + Math.random() * 40;
                        const x = Math.cos(angle * Math.PI / 180) * distance;
                        const y = Math.sin(angle * Math.PI / 180) * distance;
                        return (
                            <div
                                key={i}
                                className="particle"
                                style={{
                                    '--x': `${x}px`,
                                    '--y': `${y}px`,
                                    '--d': `${0.4 + Math.random() * 0.3}s`,
                                    backgroundColor: ['#f472b6', '#a3e635', '#22d3ee'][Math.floor(Math.random()*3)]
                                } as React.CSSProperties}
                            />
                        );
                    })}
                    <span>{hasClickedAha ? 'Awesome!' : 'I get it! 💡'}</span>
                </button>
            </div>
        </div>

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

                {/* State 2: Preview & Confirm (Only if not sharing and not success yet) */}
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
                
                {/* Error State */}
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
