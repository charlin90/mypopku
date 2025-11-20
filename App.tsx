
import React, { useState, useCallback, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept } from './types.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { CreativeView } from './components/CreativeView.js';
import { CommunityView } from './components/CommunityView.js';

type View = 'home' | 'explainer' | 'blobExplainer' | 'creativeView' | 'community';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
  const [conceptPrompt, setConceptPrompt] = useState<string | null>(null);
  const [blobUrlToLoad, setBlobUrlToLoad] = useState<string | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [creativePrompt, setCreativePrompt] = useState<string | null>(null);
  const [shareUrlOnLoad, setShareUrlOnLoad] = useState<string | null>(null);

  useEffect(() => {
    // When switching to a full-screen view, reset the window's scroll position.
    // This prevents the new view from appearing already scrolled down if the
    // user had scrolled on the home page.
    if (view === 'explainer' || view === 'blobExplainer' || view === 'creativeView' || view === 'community') {
      window.scrollTo(0, 0);
    }
  }, [view]);

  const handleConceptSubmit = useCallback(async (concept: string) => {
    if (!concept.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const content = await generateInteractiveConcept(concept);
      // The service now performs robust validation, so we can be more confident here.
      setGeneratedContent(content);
      setConceptPrompt(concept);
      setView('explainer');
    } catch (err) {
      console.error("Concept generation failed:", err);
      // The message from geminiService is designed to be user-facing.
      const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
      setError(message);
      setView('home'); // Stay on home screen if there's an error
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleCreativeSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setCreativeHtml(null);

    try {
        const html = await generateCreativePage(prompt);
        setCreativeHtml(html);
        setCreativePrompt(prompt);
        setView('creativeView');
    } catch (err) {
        console.error("Creative page generation failed:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
        setError(message);
        setView('home'); // Stay on home screen if there's an error
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (htmlContent: string, fileName: string, screenshotDataUrl: string) => {
    setIsLoading(true);
    setError(null);
    const promptKey = `Uploaded: ${fileName}`;
    
    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              html: htmlContent, 
              prompt: promptKey,
              type: 'create',
              screenshot: screenshotDataUrl,
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to share uploaded HTML');
        }

        const data = await response.json();
        setShareUrlOnLoad(data.url); // Set the URL to be passed to CreativeView

        setCreativeHtml(htmlContent);
        setCreativePrompt(promptKey);
        setView('creativeView');
    } catch (err) {
        console.error("File upload and share failed:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred during upload. Please try again.';
        setError(message);
        setView('home'); 
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleLoadBlobConcept = useCallback((blobUrl: string) => {
    setError(null);
    setBlobUrlToLoad(blobUrl);
    setView('blobExplainer');
  }, []);

  const handleGoBack = useCallback(() => {
    setView('home');
    setGeneratedContent(null);
    setConceptPrompt(null);
    setBlobUrlToLoad(null);
    setCreativeHtml(null);
    setCreativePrompt(null);
    setShareUrlOnLoad(null);
    setError(null);
  }, []);

  const handleShowCommunity = useCallback(() => {
    setView('community');
  }, []);

  return (
    <div className="relative w-full h-screen">
      {isLoading && <LoadingSpinner />}
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <HomeScreen 
          onConceptSubmit={handleConceptSubmit}
          onCreativeSubmit={handleCreativeSubmit}
          onFileUpload={handleFileUpload}
          onLoadBlobConcept={handleLoadBlobConcept}
          onShowCommunity={handleShowCommunity}
          isLoading={isLoading} 
          error={error}
        />
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'explainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {generatedContent && conceptPrompt && view === 'explainer' && (
          <ExplainerView content={generatedContent} prompt={conceptPrompt} onBack={handleGoBack} />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'blobExplainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {blobUrlToLoad && view === 'blobExplainer' && (
          <BlobExplainerView blobUrl={blobUrlToLoad} onBack={handleGoBack} />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'creativeView' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {creativeHtml && view === 'creativeView' && (
          <CreativeView 
            html={creativeHtml} 
            prompt={creativePrompt!} 
            onBack={handleGoBack}
            initialShareUrl={shareUrlOnLoad}
            onClearInitialShareUrl={() => setShareUrlOnLoad(null)}
          />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'community' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {view === 'community' && (
          <CommunityView onBack={handleGoBack} onLoadBlobConcept={handleLoadBlobConcept} />
        )}
      </div>
    </div>
  );
};

export default App;
