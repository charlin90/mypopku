import React, { useEffect, useRef, useState } from 'react';
import type { GeneratedConcept } from '../types.ts';
import { marked, type Tokens } from 'marked';

interface ExplainerViewProps {
  content: GeneratedConcept;
  onBack: () => void;
}

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

    // Guard against running in a strange environment or after DOM destruction by AI script
    if (!document.head || !document.body) {
      console.error("DOM not ready or has been destroyed. Cannot inject dynamic content.");
      return;
    }

    // Inject CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-concept-styles';
    styleElement.innerHTML = content.css;
    document.head.appendChild(styleElement);

    // This is a more robust way to execute the AI-generated script.
    // Instead of injecting a <script> tag, we use a timeout to execute the code.
    // The 100ms delay is imperceptible to the user but gives the browser
    // a guaranteed window to finish rendering and layout, preventing race conditions
    // where the script tries to find an element that isn't fully ready.
    let scriptRunnerTimeoutId: number | undefined;
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


    return () => {
      // Cleanup on unmount
      const style = document.getElementById('dynamic-concept-styles');
      if (style) style.remove();
       if (scriptRunnerTimeoutId) {
            clearTimeout(scriptRunnerTimeoutId);
        }
    };
  }, [content]);

  return (
    <div className="fixed top-0 left-0 w-full h-full p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 box-border bg-gray-900">
      <button 
        onClick={onBack} 
        className="absolute top-7 left-7 w-12 h-12 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-2xl z-20 hover:bg-gray-700 transition-colors"
        aria-label="Go back"
      >
        ←
      </button>

      <div className="col-span-1 lg:col-span-2 bg-gray-950 rounded-2xl relative overflow-hidden shadow-2xl border border-gray-800">
        <div 
          id="interactive-stage"
          ref={stageRef}
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: content.html }}
        ></div>
      </div>
      
      <div 
        id="explanation-panel"
        ref={panelRef}
        className="col-span-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 overflow-y-auto prose prose-invert text-2xl leading-normal text-gray-300 [&>p]:mb-8 prose-headings:text-teal-300 prose-strong:text-gray-100 prose-code:bg-gray-900 prose-code:px-2 prose-code:py-1 prose-code:rounded-md"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      >
      </div>
    </div>
  );
};