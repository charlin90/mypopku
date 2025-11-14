
import React, { useState, useCallback, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept } from './types.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { CreativeView } from './components/CreativeView.js';

type View = 'home' | 'explainer' | 'blobExplainer' | 'creativeView';

const SAVED_CONCEPTS_KEY = 'concept-lab-saved-concepts';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
  const [blobUrlToLoad, setBlobUrlToLoad] = useState<string | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [savedConcepts, setSavedConcepts] = useState<Record<string, GeneratedConcept>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CONCEPTS_KEY);
      if (saved) {
        setSavedConcepts(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved concepts from localStorage", e);
    }
  }, []);

  useEffect(() => {
    // When switching to a full-screen view, reset the window's scroll position.
    // This prevents the new view from appearing already scrolled down if the
    // user had scrolled on the home page.
    if (view === 'explainer' || view === 'blobExplainer' || view === 'creativeView') {
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
      
      const newSavedConcepts = { ...savedConcepts, [concept]: content };
      setSavedConcepts(newSavedConcepts);
      localStorage.setItem(SAVED_CONCEPTS_KEY, JSON.stringify(newSavedConcepts));
      
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
  }, [savedConcepts]);
  
  const handleCreativeSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setCreativeHtml(null);

    try {
        const html = await generateCreativePage(prompt);
        setCreativeHtml(html);
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

  const handleLoadBlobConcept = useCallback((blobUrl: string) => {
    setError(null);
    setBlobUrlToLoad(blobUrl);
    setView('blobExplainer');
  }, []);

  const handleGoBack = useCallback(() => {
    setView('home');
    setGeneratedContent(null);
    setBlobUrlToLoad(null);
    setCreativeHtml(null);
    setError(null);
  }, []);

  const handleLoadSavedConcept = useCallback((conceptKey: string) => {
    const conceptData = savedConcepts[conceptKey];
    if (conceptData) {
      setGeneratedContent(conceptData);
      setView('explainer');
    }
  }, [savedConcepts]);

  const handleDeleteConcept = useCallback((conceptKey: string) => {
    const newSavedConcepts = { ...savedConcepts };
    delete newSavedConcepts[conceptKey];
    setSavedConcepts(newSavedConcepts);
    localStorage.setItem(SAVED_CONCEPTS_KEY, JSON.stringify(newSavedConcepts));
  }, [savedConcepts]);

  return (
    <div className="relative w-full h-screen">
      {isLoading && <LoadingSpinner />}
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <HomeScreen 
          onConceptSubmit={handleConceptSubmit}
          onCreativeSubmit={handleCreativeSubmit}
          onLoadBlobConcept={handleLoadBlobConcept}
          isLoading={isLoading} 
          error={error}
          savedConcepts={savedConcepts}
          onLoadSaved={handleLoadSavedConcept}
          onDelete={handleDeleteConcept}
        />
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'explainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {generatedContent && view === 'explainer' && (
          <ExplainerView content={generatedContent} onBack={handleGoBack} />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'blobExplainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {blobUrlToLoad && view === 'blobExplainer' && (
          <BlobExplainerView blobUrl={blobUrlToLoad} onBack={handleGoBack} />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'creativeView' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {creativeHtml && view === 'creativeView' && (
          <CreativeView html={creativeHtml} onBack={handleGoBack} />
        )}
      </div>
    </div>
  );
};

export default App;
