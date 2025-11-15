import React, { useEffect, useRef, useState } from 'react';
import type { GeneratedConcept } from '../types.js';
import { marked, type Tokens } from 'marked';

interface ExplainerViewProps {
  content: GeneratedConcept;
  onBack: () => void;
}

const LoadingSpinnerInline: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-teal-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// Configure marked to be more robust by default.
const renderer = new marked.Renderer();
// FIX: The function signature for custom renderers has changed in recent versions of `marked`.
// We now receive a `token` object instead of separate `text` and `level` arguments.
renderer.heading = (token: Tokens.Heading) => {
  return `<h${token.depth}>${token.text}</h${token.depth}>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

export const ExplainerView: React.FC<ExplainerViewProps> = ({ content, onBack }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [initialHtml, setInitialHtml] = useState('');

  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  
  const [hasClickedAha, setHasClickedAha] = useState(false);
  const [panelPulsing, setPanelPulsing] = useState(false);

  const handleAhaClick = () => {
    if (hasClickedAha) return;
    setHasClickedAha(true);
    setPanelPulsing(true);
    
    // Remove the class after the animation is done
    setTimeout(() => setPanelPulsing(false), 700);

    // Fire and forget the save operation to Vercel Blob.
    // This happens in the background and doesn't affect the user's experience.
    fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
    })
    .then(async (response) => {
        if (response.ok) {
            console.log('Concept saved successfully after "Aha!" click.');
        } else {
            const errorData = await response.json().catch(() => ({ details: 'Could not parse error JSON.' }));
            console.error('Failed to save concept:', errorData.details || 'Unknown server error');
        }
    })
    .catch((error) => {
        console.error('Network error while trying to save concept:', error);
    });
  };

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
            body: JSON.stringify(content),
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


  // Effect to handle asynchronous markdown parsing
  useEffect(() => {
    if (content.explanation) {
      // marked.parse is async, so we must await its result
      (async () => {
        try {
          const parsedHtml = await marked.parse(content.explanation);
          setInitialHtml(parsedHtml as string);
        } catch (error) {
          console.error("Error parsing markdown:", error);
          setInitialHtml("<p>Error loading initial explanation.</p>");
        }
      })();
    } else {
      setInitialHtml('');
    }
  }, [content.explanation]);


  useEffect(() => {
    if (!content) return;

    if (!document.head || !document.body) {
      console.error("DOM not ready or has been destroyed. Cannot inject dynamic content.");
      return;
    }

    // Inject CSS
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
          // Use timeout to ensure DOM is ready after script load
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
      libraryScriptElement.async = true; // Load async to not block rendering
      libraryScriptElement.onload = () => {
        console.log(`Library loaded: ${content.libraryUrl}`);
        runAiScript();
      };
      libraryScriptElement.onerror = () => {
        console.error(`Failed to load library: ${content.libraryUrl}`);
      };
      document.body.appendChild(libraryScriptElement);
    } else {
      // No library, just run the script directly.
      runAiScript();
    }

    return () => {
      // Cleanup on unmount
      const style = document.getElementById('dynamic-concept-styles');
      if (style) style.remove();

      if (libraryScriptElement) libraryScriptElement.remove();
      
      if (scriptRunnerTimeoutId) {
        clearTimeout(scriptRunnerTimeoutId);
      }
    };
  }, [content]);

  return (
    <>
       <style>{`
        @keyframes pulse-border {
            0% {
                box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.5);
                border-color: rgba(45, 212, 191, 0.9);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(45, 212, 191, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(45, 212, 191, 0);
                border-color: rgba(45, 212, 191, 0.9);
            }
        }
        .pulse-border-animation {
            animation: pulse-border 0.7s ease-out;
        }

        @keyframes fly-out {
            0% {
                transform: translate(0, 0) scale(var(--s, 1));
                opacity: 1;
            }
            100% {
                transform: translate(var(--x), var(--y)) scale(0);
                opacity: 0;
            }
        }
        .particle {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 8px;
            height: 8px;
            background-color: #5eead4; /* teal-300 */
            border-radius: 50%;
            animation: fly-out var(--d, 0.5s) ease-out forwards;
            margin-left: -4px;
            margin-top: -4px;
        }
       `}</style>
      <div className="fixed top-0 left-0 w-full h-full p-2 sm:p-5 grid grid-cols-1 grid-rows-[minmax(0,_2fr)_minmax(0,_1fr)] lg:grid-cols-3 lg:grid-rows-1 gap-3 sm:gap-5 box-border bg-gray-900">
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
        </div>

        <div className="col-span-1 lg:col-span-2 bg-gray-950 rounded-2xl relative overflow-y-auto shadow-2xl border border-gray-800">
          <div 
            id="interactive-stage"
            ref={stageRef}
            className="w-full min-h-full flex items-center justify-center p-4 sm:p-8 box-border"
            dangerouslySetInnerHTML={{ __html: content.html }}
          ></div>
        </div>
        
        <div className="relative col-span-1">
          <div 
            id="explanation-panel"
            ref={panelRef}
            className={`h-full col-span-1 bg-gray-800/50 backdrop-blur-sm border rounded-2xl p-4 md:p-8 overflow-y-auto prose prose-invert text-2xl leading-normal text-gray-300 [&>p]:mb-8 prose-headings:text-teal-300 prose-strong:text-gray-100 prose-code:bg-gray-900 prose-code:px-2 prose-code:py-1 prose-code:rounded-md pb-28 transition-colors duration-300 ${panelPulsing ? 'pulse-border-animation' : 'border-gray-700'}`}
            dangerouslySetInnerHTML={{ __html: initialHtml }}
          >
          </div>
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-auto flex justify-center">
                <button
                    onClick={handleAhaClick}
                    disabled={hasClickedAha}
                    className={`relative overflow-hidden flex items-center justify-center gap-3 w-48 h-14 rounded-full font-semibold transition-all duration-300 group ${hasClickedAha
                            ? 'bg-teal-500 text-gray-900 cursor-not-allowed'
                            : 'border-2 border-teal-400/50 text-teal-300 hover:bg-teal-400/10 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(45,212,191,0.4)]'
                        }`}
                    aria-live="polite"
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
                                    '--s': `${0.5 + Math.random() * 0.5}`,
                                    '--d': `${0.4 + Math.random() * 0.3}s`
                                } as React.CSSProperties}
                            />
                        );
                    })}
                    <span className="relative z-10 text-2xl transition-transform duration-300 group-hover:scale-125">💡</span>
                    <span className="relative z-10 text-lg">{hasClickedAha ? 'Awesome!' : 'I get it!'}</span>
                </button>
            </div>
        </div>

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
    </>
  );
};
