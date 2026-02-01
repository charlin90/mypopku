
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept, CommunityShare, UserRole } from './types.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { CreativeView } from './components/CreativeView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { useUser, useClerk } from '@clerk/clerk-react';

type View = 'home' | 'explainer' | 'blobExplainer' | 'creativeView' | 'admin';
export type FeedTab = 'featured' | 'christmas' | 'most_viewed' | 'latest' | 'personal' | 'games' | 'tools' | 'art' | 'education' | 'ai' | 'music' | 'misc' | 'enterprise_workspace';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [homeFeedTab, setHomeFeedTab] = useState<FeedTab>('featured');
  // Track specific user profile being viewed (null implies current user if logged in)
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Enterprise State (Simulated for Prototype)
  const [userRole, setUserRole] = useState<UserRole>('personal');
  const [enterpriseName] = useState<string>('Acme Corp');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [consultantMessage, setConsultantMessage] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedConcept | null>(null);
  const [conceptPrompt, setConceptPrompt] = useState<string | null>(null);
  const [blobUrlToLoad, setBlobUrlToLoad] = useState<string | null>(null);
  const [blobPromptToLoad, setBlobPromptToLoad] = useState<string | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [creativePrompt, setCreativePrompt] = useState<string | null>(null);
  const [creativeMetadata, setCreativeMetadata] = useState<{title: string, description: string, keywords?: string} | null>(null);
  const [shareUrlOnLoad, setShareUrlOnLoad] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Language State: 'en' | 'zh'
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  
  const { user, isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();
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

  // Update role based on simulation or potential clerk metadata
  useEffect(() => {
    if (isSignedIn && user) {
        // In a real app, role would come from user.publicMetadata.role
        const savedRole = localStorage.getItem('sim_user_role') as UserRole;
        if (savedRole) setUserRole(savedRole);
    } else {
        setUserRole('personal');
    }
  }, [isSignedIn, user]);

  const handleToggleRole = useCallback((role: UserRole) => {
    setUserRole(role);
    localStorage.setItem('sim_user_role', role);
    setHomeFeedTab(role === 'enterprise' ? 'enterprise_workspace' : 'featured');
    setRefreshTrigger(prev => prev + 1);
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

  // Restore state if returning from a login redirect
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
                    setCreativeMetadata({ 
                      title: parsed.title, 
                      description: parsed.description, 
                      keywords: parsed.keywords 
                    });
                }
                setView('creativeView');
                setHomeFeedTab('personal');
            }
            sessionStorage.removeItem('restore_state');
        } catch (e) {
            console.error("Failed to restore app state:", e);
        }
    }
  }, []);

  // Handle inbound links for SEO
  useEffect(() => {
    const path = window.location.pathname;
    
    if (path === '/admin') {
        setView('admin');
        return;
    }

    const match = path.match(/^\/view\/([a-zA-Z0-9_-]+)$/);
    
    if (match) {
        const id = match[1];

        const loadItem = (data: CommunityShare) => {
             const titleText = data.title || data.prompt;
             const title = `${titleText} - MyPopku`;
             const desc = data.description 
                ? data.description 
                : `Explore "${data.prompt}" created by ${data.authorName || 'Anonymous'} on MyPopku.`;
                
             updateMetaTags(title, desc, data.screenshotUrl);
            
            if (data.blobUrl) {
                setBlobUrlToLoad(data.blobUrl);
                setBlobPromptToLoad(data.prompt);
                setView('blobExplainer');
            }
        };

        const initialData = (window as any).__INITIAL_DATA__;
        if (initialData && initialData.id === id) {
            loadItem(initialData);
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

  // Redirect to Personal Tab when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasRedirectedRef.current) {
        const isRestoring = sessionStorage.getItem('restore_state') !== null;
        if (!window.location.pathname.startsWith('/view/') && view === 'home' && !isRestoring) {
            setHomeFeedTab(userRole === 'enterprise' ? 'enterprise_workspace' : 'personal');
        }
        hasRedirectedRef.current = true;
    }
  }, [isLoaded, isSignedIn, view, userRole]);

  useEffect(() => {
    if (view === 'explainer' || view === 'blobExplainer' || view === 'creativeView') {
      window.scrollTo(0, 0);
    }
    if (view === 'home') {
        updateMetaTags(
            language === 'zh' ? 'MyPopku - 代码即魔法 | AI创意编程社区' : 'MyPopku - AI-Native Creative Coding Community | Code is Magic', 
            language === 'zh' ? '代码即魔法。MyPopku是一个AI原生的创意编程社区。无需编程基础，用自然语言将你的情感、故事与想象力，瞬间转化为互动的数字艺术与沉浸式体验。Websim的最佳平替。' : 'Code is the closest thing we have to magic. MyPopku is an AI-Native Creative Coding Community. Turn your emotions, stories, and imagination into interactive digital art instantly. The best free alternative to Websim.',
            'https://popku.com/og-image.png'
        );
        const path = language === 'zh' ? '/zh' : '/';
        window.history.pushState({}, '', path);
    }
  }, [view, language]);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setHomeFeedTab(tab);
    if (tab === 'personal') {
        setViewingProfileId(null);
    }
  }, []);

  const handleUserClick = useCallback((authorId: string) => {
    setViewingProfileId(authorId);
    setHomeFeedTab('personal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const checkGuestUsage = useCallback(() => {
    if (isSignedIn) return true;
    const count = parseInt(localStorage.getItem('guest_gen_count') || '0', 10);
    if (count >= 2) {
        openSignIn();
        return false;
    }
    return true;
  }, [isSignedIn, openSignIn]);

  const incrementGuestUsage = useCallback(() => {
    if (!isSignedIn) {
        const count = parseInt(localStorage.getItem('guest_gen_count') || '0', 10);
        localStorage.setItem('guest_gen_count', (count + 1).toString());
    }
  }, [isSignedIn]);

  const handleConceptSubmit = useCallback(async (concept: string) => {
    if (!concept.trim()) return;
    if (!checkGuestUsage()) return;
    setIsLoading(true);
    setError(null);
    setConsultantMessage(null);
    setGeneratedContent(null);
    try {
      const content = await generateInteractiveConcept(concept);
      incrementGuestUsage();
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
  }, [checkGuestUsage, incrementGuestUsage]);
  
  const handleCreativeSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!checkGuestUsage()) return;
    setIsLoading(true);
    setError(null);
    setConsultantMessage(null);
    setCreativeHtml(null);
    setCreativeMetadata(null);
    try {
        const result = await generateCreativePage(prompt);
        incrementGuestUsage();
        setCreativeHtml(result.html);
        setCreativePrompt(prompt);
        setCreativeMetadata({ 
          title: result.title, 
          description: result.description,
          keywords: result.keywords 
        });
        setView('creativeView');
    } catch (err) {
        console.error("Creative page generation failed:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred. Please try again.';
        if (message.startsWith("Technical Consultant:")) {
            setConsultantMessage(message.replace("Technical Consultant:", "").trim());
        } else {
            setError(message);
        }
        setView('home'); 
    } finally {
        setIsLoading(false);
    }
  }, [checkGuestUsage, incrementGuestUsage]);

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
              scope: userRole === 'enterprise' ? 'enterprise' : 'public'
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
  }, [user, getDisplayName, userRole]);

  const handleLoadBlobConcept = useCallback((blobUrl: string, prompt: string) => {
    setError(null);
    setBlobUrlToLoad(blobUrl);
    setBlobPromptToLoad(prompt);
    setView('blobExplainer');
    const title = `${prompt} - MyPopku`;
    const desc = `Play and explore "${prompt}". An AI-generated interactive mini-app on MyPopku.`;
    updateMetaTags(title, desc);
  }, []);

  const handleGoBack = useCallback(() => {
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
    setConsultantMessage(null);
    setRefreshTrigger(prev => prev + 1);
  }, [language]);

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
          consultantMessage={consultantMessage}
          onClearConsultantMessage={() => setConsultantMessage(null)}
          refreshTrigger={refreshTrigger}
          language={language}
          userRole={userRole}
          enterpriseName={enterpriseName}
          onToggleRole={handleToggleRole}
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
            keywords={creativeMetadata?.keywords}
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
