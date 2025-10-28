
import React, { useState, useCallback, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import type { GeneratedConcept } from './types.js';

type View = 'home' | 'explainer';

const SAVED_CONCEPTS_KEY = 'concept-lab-saved-concepts';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
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
  
  const handleLoadPreset = useCallback((conceptData: GeneratedConcept) => {
    setError(null);
    setGeneratedContent(conceptData);
    setView('explainer');
  }, []);

  const handleGoBack = useCallback(() => {
    setView('home');
    setGeneratedContent(null);
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
      
      <div className={`transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <HomeScreen 
          onConceptSubmit={handleConceptSubmit}
          onLoadPreset={handleLoadPreset}
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
    </div>
  );
};

export default App;