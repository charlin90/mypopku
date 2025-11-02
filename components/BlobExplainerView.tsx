
import React, { useState } from 'react';

interface BlobExplainerViewProps {
  blobUrl: string;
  onBack: () => void;
}

export const BlobExplainerView: React.FC<BlobExplainerViewProps> = ({ blobUrl, onBack }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  // Since the encyclopedia entry already has a public URL, we use it directly.
  const shareableUrl = blobUrl;

  const handleShareClick = () => {
    setCopyButtonText('Copy'); // Reset text in case it was 'Copied!'
    setShowShareModal(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopyButtonText('Copied!');
    setTimeout(() => setCopyButtonText('Copy'), 2000);
  };
  
  const closeShareModal = () => {
    setShowShareModal(false);
  };

  return (
    <>
      <div className="w-full h-full bg-gray-900 relative">
          <div className="absolute top-7 left-7 flex gap-3 z-20">
              <button
                  onClick={onBack}
                  className="w-12 h-12 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-2xl hover:bg-gray-700 transition-colors"
                  aria-label="Go back"
              >
                  ←
              </button>
              <button 
                  onClick={handleShareClick} 
                  className="h-12 px-6 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-semibold"
                  aria-label="Share experiment"
              >
                  Share
              </button>
          </div>
          <iframe
              src={blobUrl}
              title="Interactive Concept"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin"
          ></iframe>
      </div>
      
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white">Share Experiment</h2>
                <div className="flex flex-col gap-2">
                    <p className="text-gray-400">Anyone with this link can view this experiment from the encyclopedia.</p>
                    <div className="flex items-center gap-2 mt-2">
                        <input type="text" readOnly value={shareableUrl} className="w-full px-4 py-2 text-gray-100 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        <button onClick={handleCopy} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-28 text-center">
                            {copyButtonText}
                        </button>
                    </div>
                </div>
                 <button onClick={closeShareModal} className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors self-end">
                    Close
                </button>
            </div>
        </div>
      )}
    </>
  );
};
