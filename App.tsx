

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept, CommunityShare } from './types.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { CreativeView } from './components/CreativeView.js';
import { useUser } from '@clerk/clerk-react';

type View = 'home' | 'explainer' | 'blobExplainer' | 'creativeView';
export type FeedTab = 'featured' | 'latest' | 'personal';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [homeFeedTab, setHomeFeedTab] = useState<FeedTab>('featured');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
  const [conceptPrompt, setConceptPrompt] = useState<string | null>(null);
  const [blobUrlToLoad, setBlobUrlToLoad] = useState<string | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [creativePrompt, setCreativePrompt] = useState<string | null>(null);
  const [shareUrlOnLoad, setShareUrlOnLoad] = useState<string | null>(null);
  
  const { user, isSignedIn, isLoaded } = useUser();
  const hasRedirectedRef = useRef(false);

  // Handle inbound links for SEO (Display Wall Strategy)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/view\/([a-zA-Z0-9_-]+)$/);
    
    if (match) {
        const id = match[1];
        setIsLoading(true);
        fetch(`/api/item?id=${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Creation not found");
                return res.json();
            })
            .then((data: CommunityShare) => {
                // SEO Strategy: Title = User Prompt
                if (data.prompt) {
                    document.title = `${data.prompt} - Popku`;
                }
                
                // SEO Strategy: Page contains generated App preview
                if (data.blobUrl) {
                    setBlobUrlToLoad(data.blobUrl);
                    setView('blobExplainer');
                }
            })
            .catch(err => {
                console.error("Failed to load item:", err);
                setError("Creation not found or link is expired.");
                setView('home');
            })
            .finally(() => setIsLoading(false));
    }
  }, []);

  // Redirect to My Popku (Personal Tab) when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirectedRef.current) {
        // Don't redirect if we are already viewing a deep link (e.g., view/ID)
        if (!window.location.pathname.startsWith('/view/')) {
            setHomeFeedTab('personal');
        }
        hasRedirectedRef.current = true;
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (view === 'explainer' || view === 'blobExplainer' || view === 'creativeView') {
      window.scrollTo(0, 0);
    }
    // Reset title when going back home
    if (view === 'home') {
        document.title = 'Popku';
    }
  }, [view]);

  const handleConceptSubmit = useCallback(async (concept: string) => {
    if (!concept.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const content = await generateInteractiveConcept(concept);
      setGeneratedContent(content);
      setConceptPrompt(concept);
      setView('explainer');
    } catch (err) {
      console.error("Concept generation failed:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
      setError(message);
      setView('home'); 
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
        setView('home'); 
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Heuristic to decide whether to use Learn (Concept) or Create (Creative) mode
  const handleUnifiedSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const wordCount = trimmed.split(/\s+/).length;
    
    const creativeKeywords = [
        'create', 'make', 'generate', 'code', 'app', 'game', 'simulation', 'toy', 'builder', 'tool',
        '创建', '生成', '制作', '编写', '设计', '开发', '游戏', '模拟', '工具', '代码', '做一个', '弄一个'
    ];
    const hasCreativeKeyword = creativeKeywords.some(kw => lower.includes(kw));

    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    const isLongChinese = hasChinese && trimmed.length > 10;

    if (wordCount > 6 || isLongChinese || hasCreativeKeyword) {
        await handleCreativeSubmit(trimmed);
    } else {
        await handleConceptSubmit(trimmed);
    }
  }, [handleCreativeSubmit, handleConceptSubmit]);

  const handleFileUpload = useCallback(async (htmlContent: string, prompt: string, screenshotDataUrl: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              html: htmlContent, 
              prompt: prompt,
              type: 'create',
              screenshot: screenshotDataUrl,
              userId: user?.id,
              authorName: user?.fullName || user?.username || 'Anonymous',
              authorAvatarUrl: user?.imageUrl,
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to share uploaded HTML');
        }

        const data = await response.json();
        setShareUrlOnLoad(data.url); 

        setCreativeHtml(htmlContent);
        setCreativePrompt(prompt);
        setView('creativeView');
    } catch (err) {
        console.error("File upload and share failed:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred during upload. Please try again.';
        setError(message);
        setView('home'); 
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  const handleLoadBlobConcept = useCallback((blobUrl: string) => {
    setError(null);
    setBlobUrlToLoad(blobUrl);
    setView('blobExplainer');
  }, []);

  const handleGoBack = useCallback(() => {
    // If we are in a deep-linked view (blobExplainer active on load), hitting back should go to home
    if (window.location.pathname.startsWith('/view/')) {
        window.history.pushState({}, '', '/');
    }
    setView('home');
    setGeneratedContent(null);
    setConceptPrompt(null);
    setBlobUrlToLoad(null);
    setCreativeHtml(null);
    setCreativePrompt(null);
    setShareUrlOnLoad(null);
    setError(null);
  }, []);

  return (
    <div className="relative w-full h-screen">
      {isLoading && <LoadingSpinner />}
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <HomeScreen 
          activeTab={homeFeedTab}
          onTabChange={setHomeFeedTab}
          userId={user?.id}
          onUnifiedSubmit={handleUnifiedSubmit}
          onFileUpload={handleFileUpload}
          onLoadBlobConcept={handleLoadBlobConcept}
          isLoading={isLoading} 
          error={error}
        />
      </div>
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'explainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {generatedContent && conceptPrompt && view === 'explainer' && (
          <ExplainerView 
            content={generatedContent} 
            prompt={conceptPrompt} 
            onBack={handleGoBack} 
            userId={user?.id}
            userName={user?.fullName || user?.username || 'Anonymous'}
            userAvatarUrl={user?.imageUrl}
          />
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
            userId={user?.id}
            userName={user?.fullName || user?.username || 'Anonymous'}
            userAvatarUrl={user?.imageUrl}
          />
        )}
      </div>
    </div>
  );
};

export default App;