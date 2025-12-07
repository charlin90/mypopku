import { useState, useCallback, useEffect } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { HomeScreen } from './components/HomeScreen.js';
import { ExplainerView } from './components/ExplainerView.js';
import { CreativeView } from './components/CreativeView.js';
import { BlobExplainerView } from './components/BlobExplainerView.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { generateInteractiveConcept } from './services/geminiService.js';
import { generateCreativePage } from './services/creativeService.js';
import type { GeneratedConcept } from './types.js';

export type FeedTab = 'featured' | 'latest' | 'games' | 'tools' | 'art' | 'education' | 'ai' | 'music' | 'misc' | 'personal' | 'christmas' | 'most_viewed';

type ViewState = 'home' | 'explainer' | 'creative' | 'blob';

// Replace this with your actual Lemon Squeezy Checkout URL
const PAYMENT_URL = "https://popku.lemonsqueezy.com/buy/153b1de3-a365-419f-bfdc-c5e9f214fc9c";

export default function App() {
  const { openSignIn } = useClerk();
  const { isSignedIn, user } = useUser();

  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [activeTab, setActiveTab] = useState<FeedTab>('featured');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [prompt, setPrompt] = useState('');
  const [generatedConcept, setGeneratedConcept] = useState<GeneratedConcept | null>(null);
  const [creativeHtml, setCreativeHtml] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [initialShareUrl, setInitialShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const restoreState = sessionStorage.getItem('restore_state');
    if (restoreState) {
      try {
        const parsed = JSON.parse(restoreState);
        if (parsed.view === 'explainer' && parsed.content) {
          setGeneratedConcept(parsed.content);
          setPrompt(parsed.prompt);
          setCurrentView('explainer');
        } else if (parsed.view === 'creativeView' && parsed.html) {
          setCreativeHtml(parsed.html);
          setPrompt(parsed.prompt);
          setCurrentView('creative');
        }
      } catch (e) {
        console.error("Failed to restore state", e);
      }
      sessionStorage.removeItem('restore_state');
    }
  }, []);

  const handleConceptSubmit = useCallback(async (inputPrompt: string) => {
    setIsLoading(true);
    setError(null);
    setPrompt(inputPrompt);
    try {
      const concept = await generateInteractiveConcept(inputPrompt, user?.id);
      setGeneratedConcept(concept);
      setCurrentView('explainer');
    } catch (err: any) {
      if (err.message === 'Daily limit reached') {
        const checkoutUrl = `${PAYMENT_URL}?checkout[custom][user_id]=${user?.id}`;
        window.location.href = checkoutUrl;
        return;
      }
      setError(err.message || 'Failed to generate concept.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleCreativeSubmit = useCallback(async (inputPrompt: string) => {
    setIsLoading(true);
    setError(null);
    setPrompt(inputPrompt);
    try {
      const html = await generateCreativePage(inputPrompt, user?.id);
      setCreativeHtml(html);
      setCurrentView('creative');
    } catch (err: any) {
      if (err.message === 'Daily limit reached') {
        const checkoutUrl = `${PAYMENT_URL}?checkout[custom][user_id]=${user?.id}`;
        window.location.href = checkoutUrl;
        return;
      }
      setError(err.message || 'Failed to generate creative page.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleUnifiedSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!isSignedIn) {
        openSignIn();
        return;
    }

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
  }, [handleCreativeSubmit, handleConceptSubmit, isSignedIn, openSignIn]);

  const handleFileUpload = useCallback(async (htmlContent: string, uploadPrompt: string, screenshotDataUrl: string) => {
      setIsLoading(true);
      setError(null);
      try {
          const type = 'create'; 
          const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                html: htmlContent,
                prompt: uploadPrompt,
                type,
                screenshot: screenshotDataUrl,
                userId: user?.id,
                authorName: user?.fullName || user?.firstName || 'Anonymous',
                authorAvatarUrl: user?.imageUrl,
             }),
        });

        if (!response.ok) {
            throw new Error('Failed to upload share.');
        }

        const data = await response.json();
        setCreativeHtml(htmlContent);
        setPrompt(uploadPrompt);
        setInitialShareUrl(data.url);
        setCurrentView('creative');
        setRefreshTrigger(prev => prev + 1);

      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const handleLoadBlobConcept = useCallback((url: string, conceptPrompt?: string) => {
    setBlobUrl(url);
    if (conceptPrompt) setPrompt(conceptPrompt);
    setCurrentView('blob');
  }, []);

  const handleUserClick = useCallback((authorId: string) => {
    setViewingProfileId(authorId);
    setActiveTab('personal');
    setCurrentView('home'); 
  }, []);

  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab);
    if (tab !== 'personal') {
        setViewingProfileId(null);
    } else if (!viewingProfileId && user) {
        setViewingProfileId(user.id);
    }
  }, [viewingProfileId, user]);

  return (
    <div className="w-full h-screen overflow-hidden">
        {isLoading && <LoadingSpinner />}
        
        {currentView === 'home' && (
            <HomeScreen
                activeTab={activeTab}
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
            />
        )}

        {currentView === 'explainer' && generatedConcept && (
            <ExplainerView
                content={generatedConcept}
                prompt={prompt}
                onBack={() => setCurrentView('home')}
                userId={user?.id}
                userName={user?.fullName || user?.firstName || 'Anonymous'}
                userAvatarUrl={user?.imageUrl}
            />
        )}

        {currentView === 'creative' && creativeHtml && (
            <CreativeView
                html={creativeHtml}
                prompt={prompt}
                onBack={() => setCurrentView('home')}
                initialShareUrl={initialShareUrl}
                onClearInitialShareUrl={() => setInitialShareUrl(null)}
                userId={user?.id}
                userName={user?.fullName || user?.firstName || 'Anonymous'}
                userAvatarUrl={user?.imageUrl}
            />
        )}

        {currentView === 'blob' && blobUrl && (
            <BlobExplainerView
                blobUrl={blobUrl}
                prompt={prompt}
                onBack={() => setCurrentView('home')}
            />
        )}
    </div>
  );
}