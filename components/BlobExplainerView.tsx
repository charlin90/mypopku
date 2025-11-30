
import React, { useState } from 'react';

interface BlobExplainerViewProps {
  blobUrl: string;
  onBack: () => void;
}

export const BlobExplainerView: React.FC<BlobExplainerViewProps> = ({ blobUrl, onBack }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const shareableUrl = blobUrl;

  const handleShareClick = () => {
    setCopyButtonText('Copy');
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

  const btnStyle = "bg-white border-2 border-black text-black font-bold py-2 px-4 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all";

  return (
    <>
      <div className="w-full h-full bg-amber-50 relative">
          <div className="absolute top-4 left-4 flex gap-4 z-20">
              <button
                  onClick={onBack}
                  className={btnStyle}
                  aria-label="Go back"
              >
                  Back
              </button>
              <button 
                  onClick={handleShareClick} 
                  className={btnStyle}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeShareModal}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black text-black">Share It!</h2>
                <div className="flex flex-col gap-4">
                    <p className="text-gray-600 font-medium">Anyone with this link can view this experiment.</p>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={shareableUrl} className="w-full px-4 py-3 text-black bg-gray-50 border-2 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-200" />
                        <button onClick={handleCopy} className="bg-teal-300 border-2 border-black text-black font-bold py-3 px-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex-shrink-0 w-24">
                            {copyButtonText}
                        </button>
                    </div>
                </div>
                 <button onClick={closeShareModal} className="mt-2 bg-gray-200 hover:bg-gray-300 text-black border-2 border-black font-bold py-2 px-6 rounded-xl self-end">
                    Close
                </button>
            </div>
        </div>
      )}
    </>
  );
};
