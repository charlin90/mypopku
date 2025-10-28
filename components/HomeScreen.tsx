import React, { useState } from 'react';
import type { GeneratedConcept } from '../types.js';
import { PRESET_CONCEPTS } from '../data/presets.js';

interface HomeScreenProps {
  onConceptSubmit: (concept: string) => void;
  onLoadPreset: (concept: GeneratedConcept) => void;
  isLoading: boolean;
  error: string | null;
  savedConcepts: Record<string, GeneratedConcept>;
  onLoadSaved: (conceptKey: string) => void;
  onDelete: (conceptKey: string) => void;
}

const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);


export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onConceptSubmit, 
  onLoadPreset,
  isLoading, 
  error,
  savedConcepts,
  onLoadSaved,
  onDelete
}) => {
  const [inputValue, setInputValue] = useState('');
  const savedConceptKeys = Object.keys(savedConcepts);
  const presetKeys = Object.keys(PRESET_CONCEPTS);

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

  return (
    <div className="flex flex-col justify-center items-center w-full min-h-screen p-4 bg-gray-900 overflow-y-auto">
      <div className="flex flex-col items-center text-center w-full max-w-2xl pt-24 pb-12 flex-shrink-0">
        <div className="mb-6">
          <svg className="w-24 h-24 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l.259 1.035L18 21.75l-.843-2.846a4.5 4.5 0 00-3.09-3.09L11.25 15l2.846-.813a4.5 4.5 0 003.09-3.09l.813-2.846L18 9.75l-.813 2.846a4.5 4.5 0 00-3.09 3.09L11.25 15l2.846.813a4.5 4.5 0 003.09 3.09z" />
          </svg>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 text-transparent bg-clip-text mb-3">
          Concept X Lab
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl">Enter a concept, and the AI will create an interactive experiment to help you understand it.</p>
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
         {error && <p className="text-red-400 mt-4">{error}</p>}
         <div className="mt-8 text-gray-500">
           <p>Try some preset concepts:</p>
           <div className="flex gap-4 mt-2">
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

      {savedConceptKeys.length > 0 && (
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
    </div>
  );
};