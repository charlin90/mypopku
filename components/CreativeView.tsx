
import React from 'react';

interface CreativeViewProps {
  html: string;
  onBack: () => void;
}

export const CreativeView: React.FC<CreativeViewProps> = ({ html, onBack }) => {
  return (
    <div className="w-full h-full bg-gray-900 relative">
      <div className="absolute top-7 left-7 flex gap-3 z-20">
        <button
          onClick={onBack}
          className="w-12 h-12 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-full flex items-center justify-center text-2xl hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          ←
        </button>
      </div>
      <iframe
        srcDoc={html}
        title="Generated AI Content"
        className="w-full h-full border-none"
        sandbox="allow-scripts"
      />
    </div>
  );
};
