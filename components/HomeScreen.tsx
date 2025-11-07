
import React, { useState, useEffect } from 'react';
import type { GeneratedConcept, EncyclopediaEntry } from '../types.js';
import { PRESET_CONCEPTS } from '../data/presets.js';

// --- TYPE DEFINITIONS ---
// These interfaces define the structure for the dynamically processed encyclopedia data
export interface EncyclopediaConcept {
  name: string;
  description: string;
  imageUrl: string;
  blobUrl: string;
}

export interface EncyclopediaCategory {
  name: string;
  icon: React.FC<{ className?: string }>;
  concepts: EncyclopediaConcept[];
}


// --- PROPS INTERFACE ---
interface HomeScreenProps {
  onConceptSubmit: (concept: string) => void;
  onLoadPreset: (concept: GeneratedConcept) => void;
  onLoadBlobConcept: (blobUrl: string) => void;
  isLoading: boolean;
  error: string | null;
  savedConcepts: Record<string, GeneratedConcept>;
  onLoadSaved: (conceptKey: string) => void;
  onDelete: (conceptKey: string) => void;
}

// --- SVG ICONS ---
// These icons are now defined locally as data/encyclopedia.ts has been removed.
const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const DiscordIcon: React.FC = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
        <path d="M20.3 4.4c-1.4-.9-3-1.6-4.6-1.9a.7.7 0 0 0-.7.1l-.4 2.1a15.2 15.2 0 0 0-5.2 0l-.4-2.1a.7.7 0 0 0-.7-.1c-1.7.3-3.3.9-4.7 1.9a.7.7 0 0 0-.2.8l1.8 5.9a15.3 15.3 0 0 0-4.5 4.1.7.7 0 0 0 .2 1c2.8 1.8 5.2 2.2 7.4 2.2h.1c2.2 0 4.6-.4 7.4-2.2a.7.7 0 0 0 .2-1 15.3 15.3 0 0 0-4.5-4.1l1.8-5.9a.7.7 0 0 0-.2-.8zM12 15.4c-1.4 0-2.6-1.2-2.6-2.7s1.2-2.7 2.6-2.7c1.4 0 2.6 1.2 2.6 2.7s-1.2 2.7-2.6 2.7zm3.4-5.8c-.9 0-1.6-.8-1.6-1.7s.7-1.7 1.6-1.7c.9 0 1.6.8 1.6 1.7s-.7 1.7-1.6 1.7zm-6.8 0c-.9 0-1.6-.8-1.6-1.7s.7-1.7 1.6-1.7c.9 0 1.6.8 1.6 1.7s-.7 1.7-1.6 1.7z" />
    </svg>
);
const EmailIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" role="img" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
);
const PhysicsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => React.createElement('svg',{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",className:className},React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M11.25 4.5A7.5 7.5 0 0 1 18.75 12a7.5 7.5 0 0 1-7.5 7.5m-5.625-15A7.5 7.5 0 0 0 3.75 12a7.5 7.5 0 0 0 1.875 4.995M14.25 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"}));
const BiologyIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => React.createElement('svg',{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",className:className},React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M3.75 12.75c0-1.02.57-1.921 1.423-2.417C6.32 9.69 8.03 9 9.75 9h4.5c1.72 0 3.43.69 4.577 1.333 1.147.644 1.147 2.19 0 2.834C17.68 14.31 15.97 15 14.25 15h-4.5c-1.72 0-3.43-.69-4.577-1.333A2.625 2.625 0 0 1 3.75 12.75Z"}),React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M3.75 6.75c0-1.02.57-1.921 1.423-2.417C6.32 3.69 8.03 3 9.75 3h4.5c1.72 0 3.43.69 4.577 1.333 1.147.644 1.147 2.19 0 2.834C17.68 7.31 15.97 8 14.25 8h-4.5c-1.72 0-3.43-.69-4.577-1.333A2.625 2.625 0 0 1 3.75 6.75Z"}),React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M3.75 18.75c0-1.02.57-1.921 1.423-2.417C6.32 15.69 8.03 15 9.75 15h4.5c1.72 0 3.43.69 4.577 1.333 1.147.644 1.147 2.19 0 2.834C17.68 19.31 15.97 20 14.25 20h-4.5c-1.72 0-3.43-.69-4.577-1.333A2.625 2.625 0 0 1 3.75 18.75Z"}));
const ComputerScienceIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => React.createElement('svg',{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",className:className},React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"}));
const GridIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => React.createElement('svg',{xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor",className:className},React.createElement('path',{strokeLinecap:"round",strokeLinejoin:"round",d:"M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"}));

// --- CATEGORY MAPPING ---
// Maps category keys from the database to display names and icons.
const categoryDetails: Record<string, { displayName: string, icon: React.FC<{ className?: string }> }> = {
    'physics': { displayName: 'Physics', icon: PhysicsIcon },
    'biology': { displayName: 'Biology', icon: BiologyIcon },
    'programming': { displayName: 'Computer Science', icon: ComputerScienceIcon },
};

// --- DATA PROCESSING UTILITY ---
// This function transforms the flat list of entries from the API into a structured array of categories.
const processEntriesIntoCategories = (entries: EncyclopediaEntry[]): EncyclopediaCategory[] => {
    const categoriesMap: Record<string, EncyclopediaConcept[]> = {};

    entries.forEach(entry => {
        if (!categoriesMap[entry.category]) {
            categoriesMap[entry.category] = [];
        }
        categoriesMap[entry.category].push({
            name: entry.title,
            description: entry.description,
            imageUrl: entry.previewImageUrl,
            blobUrl: entry.blobUrl,
        });
    });

    const baseCategories: EncyclopediaCategory[] = Object.keys(categoriesMap).map(categoryKey => {
        const details = categoryDetails[categoryKey.toLowerCase()] || { displayName: categoryKey, icon: GridIcon };
        return {
            name: details.displayName,
            icon: details.icon,
            concepts: categoriesMap[categoryKey],
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const allConcepts = entries.map(entry => ({
        name: entry.title,
        description: entry.description,
        imageUrl: entry.previewImageUrl,
        blobUrl: entry.blobUrl,
    }));

    const allCategory: EncyclopediaCategory = {
        name: 'All',
        icon: GridIcon,
        concepts: allConcepts,
    };

    return [allCategory, ...baseCategories];
};

// --- MAIN COMPONENT ---
export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onConceptSubmit, 
  onLoadPreset,
  onLoadBlobConcept,
  isLoading, 
  error,
  savedConcepts,
  onLoadSaved,
  onDelete
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'lab' | 'encyclopedia'>('lab');
  const [searchQuery, setSearchQuery] = useState('');

  // State for dynamically loaded encyclopedia data
  const [encyclopediaCategories, setEncyclopediaCategories] = useState<EncyclopediaCategory[]>([]);
  const [isEncyclopediaLoading, setIsEncyclopediaLoading] = useState(true);
  const [encyclopediaError, setEncyclopediaError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch encyclopedia data when the tab is active and data hasn't been loaded yet.
  useEffect(() => {
    const fetchEncyclopedia = async () => {
        setIsEncyclopediaLoading(true);
        setEncyclopediaError(null);
        try {
            const response = await fetch('/api/encyclopedia');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to load the encyclopedia.');
            }
            const entries: EncyclopediaEntry[] = await response.json();
            const processed = processEntriesIntoCategories(entries);
            setEncyclopediaCategories(processed);
            if (processed.length > 0) {
                setSelectedCategory(processed[0].name); // Default to 'All'
            }
        } catch (err) {
            setEncyclopediaError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsEncyclopediaLoading(false);
        }
    };

    if (activeTab === 'encyclopedia' && encyclopediaCategories.length === 0) {
        fetchEncyclopedia();
    }
  }, [activeTab, encyclopediaCategories.length]);


  const savedConceptKeys = Object.keys(savedConcepts);
  const presetKeys = Object.keys(PRESET_CONCEPTS);
  
  const currentCategory = encyclopediaCategories.find(cat => cat.name === selectedCategory);
  
  const filteredConcepts = currentCategory?.concepts.filter(concept => {
    const query = searchQuery.toLowerCase();
    return (
      concept.name.toLowerCase().includes(query) ||
      concept.description.toLowerCase().includes(query)
    );
  }) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue && !isLoading) {
      onConceptSubmit(inputValue);
    }
  };

  const handlePresetClick = (conceptName: string) => {
    if (isLoading) return;
    const presetData = PRESET_CONCEPTS[conceptName];
    if (presetData) {
      onLoadPreset(presetData);
    }
  };
  
  const descriptionText = activeTab === 'lab' 
    ? "Enter a concept, and the AI will create an interactive experiment to help you understand it." 
    : "Explore our interactive encyclopedia. Search or browse by category.";

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-900">
      <main className="flex-grow w-full p-4 overflow-y-auto flex flex-col items-center">
        <div className="flex flex-col items-center text-center w-full max-w-7xl pt-24 pb-12 flex-shrink-0">
          <div className="mb-6">
            <svg className="w-24 h-24 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l.259 1.035L18 21.75l-.843-2.846a4.5 4.5 0 00-3.09-3.09L11.25 15l2.846-.813a4.5 4.5 0 003.09-3.09l.813-2.846L18 9.75l-.813 2.846a4.5 4.5 0 00-3.09 3.09L11.25 15l2.846.813a4.5 4.5 0 003.09 3.09z" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 text-transparent bg-clip-text mb-3">
            Concept X Lab
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl">{descriptionText}</p>
          
          <div className="bg-gray-800 p-1 rounded-full flex items-center space-x-1 mb-8 shadow-inner">
            <button onClick={() => setActiveTab('lab')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'lab' ? 'bg-teal-500 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>Lab</button>
            <button onClick={() => setActiveTab('encyclopedia')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'encyclopedia' ? 'bg-teal-500 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>Encyclopedia</button>
          </div>

          <div className="relative w-full max-w-7xl min-h-[300px]">
            {/* LAB VIEW */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'lab' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex flex-col items-center w-full">
                <form onSubmit={handleSubmit} className="w-full max-w-lg">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g., Photosynthesis, CSS Flexbox, Black Holes"
                    className="w-full px-6 py-4 text-lg text-center text-gray-100 bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
                    disabled={isLoading}
                  />
                </form>
                {error && (
                    <div className="w-full max-w-lg mt-4 text-left">
                      <pre className="text-red-300 bg-red-900/30 border border-red-700 p-4 rounded-lg whitespace-pre-wrap text-xs font-mono overflow-x-auto">
                        <code>{error}</code>
                      </pre>
                    </div>
                )}
                <div className="mt-8 text-gray-500">
                  <p>Or try some preset concepts:</p>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {presetKeys.map(key => (
                        <button 
                          key={key}
                          onClick={() => handlePresetClick(key)} 
                          className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm disabled:opacity-50"
                          disabled={isLoading}
                        >
                          {key}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ENCYCLOPEDIA VIEW */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'encyclopedia' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {isEncyclopediaLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
              ) : encyclopediaError ? (
                  <div className="text-center py-10 text-red-400 bg-red-900/20 border border-red-800 rounded-lg max-w-md mx-auto">
                      <p className="text-lg font-semibold">Could not load encyclopedia</p>
                      <p className="mt-1 text-red-300">{encyclopediaError}</p>
                  </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="w-full max-w-lg mb-6">
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search for a concept in ${selectedCategory}...`}
                        className="w-full px-5 py-3 text-base text-gray-100 bg-gray-800/80 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow"
                    />
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    {encyclopediaCategories.map((category) => (
                      <button 
                        key={category.name} 
                        onClick={() => {
                            setSelectedCategory(category.name);
                            setSearchQuery('');
                        }} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedCategory === category.name ? 'bg-teal-400/10 border-teal-400 text-teal-300' : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-700/80 hover:border-gray-600'}`}
                      >
                        <category.icon className="w-5 h-5" />
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>

                  {filteredConcepts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                      {filteredConcepts.map((concept) => (
                        <button 
                          key={concept.name} 
                          onClick={() => onLoadBlobConcept(concept.blobUrl)} 
                          className="group bg-gray-800/50 border border-gray-700 rounded-lg text-left transition-all hover:bg-gray-800 hover:border-teal-500 hover:scale-105 disabled:opacity-50 disabled:pointer-events-none overflow-hidden flex flex-col h-full"
                          disabled={isLoading}
                        >
                          <div className="w-full aspect-video bg-gray-900 overflow-hidden">
                            <img
                              src={concept.imageUrl}
                              alt={`Preview for ${concept.name}`}
                              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-4 flex flex-col flex-grow text-center">
                            <h3 className="text-lg font-bold text-gray-200 group-hover:text-teal-300 mb-1">
                              {concept.name}
                            </h3>
                            <p className="text-sm text-gray-400 flex-grow">
                              {concept.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                        <p className="text-lg font-semibold">No concepts found</p>
                        <p className="mt-1">Try adjusting your search query.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'lab' && savedConceptKeys.length > 0 && (
          <div className="w-full max-w-5xl mt-4 border-t border-gray-800 pt-12 pb-24">
            <h2 className="text-xl font-bold text-gray-300 text-center mb-8">Saved Experiments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedConceptKeys.map((key) => (
                <div 
                  key={key} 
                  onClick={() => onLoadSaved(key)}
                  className="group relative bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer transition-all hover:bg-gray-800 hover:border-teal-500 hover:scale-105"
                  aria-label={`Load ${key}`}
                >
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-teal-300 truncate w-full">
                    {key}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(key);
                    }}
                    className="absolute top-3 right-3 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${key}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="w-full p-6 text-center text-gray-500 text-sm flex-shrink-0">
        <div className="flex justify-center items-center gap-x-8 gap-y-2 flex-wrap">
            <a href="https://discord.gg/x4am4gaRZY" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-teal-400 transition-colors">
                <DiscordIcon />
                Join our Discord
            </a>
            <a href="mailto:intelliflux.ltd@gmail.com" className="flex items-center gap-2 hover:text-teal-400 transition-colors">
                <EmailIcon />
                intelliflux.ltd@gmail.com
            </a>
        </div>
      </footer>
    </div>
  );
};
