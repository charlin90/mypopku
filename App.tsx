

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept, CommunityShare } from './types.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { CreativeView } from './components/CreativeView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { useUser } from '@clerk/clerk-react';

type View = 'home' | 'explainer' | 'blobExplainer' | 'creativeView' | 'admin';
export type FeedTab = 'featured' | 'christmas' | 'most_viewed' | 'latest' | 'personal' | 'games' | 'tools' | 'art' | 'education' | 'ai' | 'music' | 'misc';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [homeFeedTab, setHomeFeedTab] = useState<FeedTab>('featured');
  // Track specific user profile being viewed (null implies current user if logged in)
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
  const [conceptPrompt, setConceptPrompt] = useState<string | null>(null);
  const [blobUrlToLoad, setBlobUrlToLoad] = useState<string | null>(null);
  const [blobPromptToLoad, setBlobPromptToLoad] = useState<string | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [creativePrompt, setCreativePrompt] = useState<string | null>(null);
  const [creativeMetadata, setCreativeMetadata] = useState<{title: string, description: string} | null>(null);
  const [shareUrlOnLoad, setShareUrlOnLoad] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Language State: 'en' | 'zh'
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  
  const { user, isSignedIn, isLoaded } = useUser();
  const hasRedirectedRef = useRef(false);

  // Initialize Language based on URL or Browser
  useEffect(() => {
    const path = window.location.pathname;
    const isZhPath = path.startsWith('/zh');
    const isZhBrowser = navigator.language.startsWith('zh');

    if (isZhPath) {
        setLanguage('zh');
    } else if (path === '/' && isZhBrowser) {
        // Auto-redirect to /zh for Chinese users on root
        window.history.replaceState(null, '', '/zh');
        setLanguage('zh');
    }
  }, []);

  // Helper to get display name: Username > FirstName > Anonymous
  const getDisplayName = useCallback(() => {
    if (!user) return 'Anonymous';
    return user.username || user.firstName || 'Anonymous';
  }, [user]);

  // Update Meta Tags Helper
  const updateMetaTags = (title: string, description: string, image?: string) => {
    document.title = title;
    
    const setMeta = (name: string, content: string) => {
        let element = document.querySelector(`meta[name="${name}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute('name', name);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    const setOg = (property: string, content: string) => {
        let element = document.querySelector(`meta[property="${property}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute('property', property);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    setMeta('description', description);
    setOg('og:title', title);
    setOg('og:description', description);
    if (image) {
        setOg('og:image', image);
        setOg('twitter:image', image);
    }
  };

  // Restore state if returning from a login redirect (which causes page refresh)
  useEffect(() => {
    const restoreState = sessionStorage.getItem('restore_state');
    if (restoreState) {
        try {
            const parsed = JSON.parse(restoreState);
            if (parsed.view === 'explainer' && parsed.content && parsed.prompt) {
                setGeneratedContent(parsed.content);
                setConceptPrompt(parsed.prompt);
                setView('explainer');
                setHomeFeedTab('personal');
            } else if (parsed.view === 'creativeView' && parsed.html && parsed.prompt) {
                setCreativeHtml(parsed.html);
                setCreativePrompt(parsed.prompt);
                if (parsed.title && parsed.description) {
                    setCreativeMetadata({ title: parsed.title, description: parsed.description });
                }
                setView('creativeView');
                setHomeFeedTab('personal');
            }
            // Clear immediately to prevent restoring on subsequent manual refreshes
            sessionStorage.removeItem('restore_state');
        } catch (e) {
            console.error("Failed to restore app state:", e);
        }
    }
  }, []);

  // Handle inbound links for SEO (Display Wall Strategy) & Admin routing
  useEffect(() => {
    const path = window.location.pathname;
    
    // Check for Admin Route
    if (path === '/admin') {
        setView('admin');
        return;
    }

    const match = path.match(/^\/view\/([a-zA-Z0-9_-]+)$/);
    
    if (match) {
        const id = match[1];

        const loadItem = (data: CommunityShare) => {
             // SEO Strategy: Title = Item Title or User Prompt
             const titleText = data.title || data.prompt;
             const title = `${titleText} - MyPopku`;
             const desc = data.description 
                ? data.description 
                : `Explore "${data.prompt}" created by ${data.authorName || 'Anonymous'} on MyPopku.`;
                
             updateMetaTags(title, desc, data.screenshotUrl);
            
            // SEO Strategy: Page contains generated App preview
            if (data.blobUrl) {
                setBlobUrlToLoad(data.blobUrl);
                setBlobPromptToLoad(data.prompt);
                setView('blobExplainer');
            }
        };

        // Check for server-injected initial data to avoid double fetch
        const initialData = (window as any).__INITIAL_DATA__;
        if (initialData && initialData.id === id) {
            loadItem(initialData);
            // Clear to prevent reuse issues if navigating
            (window as any).__INITIAL_DATA__ = undefined;
        } else {
            setIsLoading(true);
            fetch(`/api/item?id=${id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Creation not found");
                    return res.json();
                })
                .then(loadItem)
                .catch(err => {
                    console.error("Failed to load item:", err);
                    setError("Creation not found or link is expired.");
                    setView('home');
                })
                .finally(() => setIsLoading(false));
        }
    }
  }, []);

  // Redirect to My MyPopku (Personal Tab) when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirectedRef.current) {
        // Don't redirect if we are already viewing a deep link (e.g., view/ID)
        // Also don't redirect if we just restored a view (e.g. explainer/creative)
        const isRestoring = sessionStorage.getItem('restore_state') !== null;
        if (!window.location.pathname.startsWith('/view/') && view === 'home' && !isRestoring) {
            setHomeFeedTab('personal');
        }
        hasRedirectedRef.current = true;
    }
  }, [isLoaded, isSignedIn, view]);

  useEffect(() => {
    if (view === 'explainer' || view === 'blobExplainer' || view === 'creativeView') {
      window.scrollTo(0, 0);
    }
    // Reset title when going back home
    if (view === 'home') {
        updateMetaTags(
            language === 'zh' ? 'MyPopku - AI原生互动内容社区' : 'MyPopku - Generate Interactive Concepts with AI', 
            'An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand.',
            'https://popku.com/og-image.png'
        );
        // Only push '/' if we are not on /zh
        const path = language === 'zh' ? '/zh' : '/';
        window.history.pushState({}, '', path);
    }
  }, [view, language]);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setHomeFeedTab(tab);
    // If explicitly clicking the personal tab, reset to "My" profile (current user)
    if (tab === 'personal') {
        setViewingProfileId(null);
    }
  }, []);

  const handleUserClick = useCallback((authorId: string) => {
    setViewingProfileId(authorId);
    setHomeFeedTab('personal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    setCreativeMetadata(null);

    try {
        const result = await generateCreativePage(prompt);
        setCreativeHtml(result.html);
        setCreativePrompt(prompt);
        setCreativeMetadata({ title: result.title, description: result.description });
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
              authorName: getDisplayName(),
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
        // For uploaded files, we lack AI generated metadata, so passing null will fallback to prompt usage
        setCreativeMetadata(null);
        setView('creativeView');
    } catch (err) {
        console.error("File upload and share failed:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred during upload. Please try again.';
        setError(message);
        setView('home'); 
    } finally {
        setIsLoading(false);
    }
  }, [user, getDisplayName]);

  const handleLoadBlobConcept = useCallback((blobUrl: string, prompt: string) => {
    setError(null);
    setBlobUrlToLoad(blobUrl);
    setBlobPromptToLoad(prompt);
    setView('blobExplainer');
    
    // Update Meta Tags for internal navigation
    const title = `${prompt} - MyPopku`;
    const desc = `Play and explore "${prompt}". An AI-generated interactive concept on MyPopku.`;
    updateMetaTags(title, desc);
  }, []);

  const handleGoBack = useCallback(() => {
    // If we are in a deep-linked view (blobExplainer active on load), hitting back should go to home
    if (window.location.pathname.startsWith('/view/')) {
        const path = language === 'zh' ? '/zh' : '/';
        window.history.pushState({}, '', path);
    }
    setView('home');
    setGeneratedContent(null);
    setConceptPrompt(null);
    setBlobUrlToLoad(null);
    setBlobPromptToLoad(null);
    setCreativeHtml(null);
    setCreativePrompt(null);
    setCreativeMetadata(null);
    setShareUrlOnLoad(null);
    setError(null);
    setRefreshTrigger(prev => prev + 1);
  }, [language]);

  // Simple Router Switch
  if (view === 'admin') {
      return <AdminDashboard />;
  }

  return (
    <div className="relative w-full h-screen">
      {isLoading && <LoadingSpinner />}
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <HomeScreen 
          activeTab={homeFeedTab}
          onTabChange={handleTabChange}
          userId={user?.id}
          viewingProfileId={viewingProfileId}
          onUserClick={handleUserClick}
          onUnifiedSubmit={handleUnifiedSubmit}
          onFileUpload={handleFileUpload}
          onLoadBlobConcept={handleLoadBlobConcept}
          isLoading={isLoading} 
          error={error}
          refreshTrigger={refreshTrigger}
          language={language}
        />
      </div>
      
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'explainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {generatedContent && conceptPrompt && view === 'explainer' && (
          <ExplainerView 
            content={generatedContent} 
            prompt={conceptPrompt} 
            onBack={handleGoBack} 
            userId={user?.id}
            userName={getDisplayName()}
            userAvatarUrl={user?.imageUrl}
          />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'blobExplainer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {blobUrlToLoad && view === 'blobExplainer' && (
          <BlobExplainerView 
            blobUrl={blobUrlToLoad} 
            prompt={blobPromptToLoad || ''}
            onBack={handleGoBack} 
          />
        )}
      </div>

      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${view === 'creativeView' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {creativeHtml && view === 'creativeView' && (
          <CreativeView 
            html={creativeHtml} 
            prompt={creativePrompt!}
            title={creativeMetadata?.title}
            description={creativeMetadata?.description}
            onBack={handleGoBack}
            initialShareUrl={shareUrlOnLoad}
            onClearInitialShareUrl={() => setShareUrlOnLoad(null)}
            userId={user?.id}
            userName={getDisplayName()}
            userAvatarUrl={user?.imageUrl}
          />
        )}
      </div>
    </div>
  );
};

export default App;