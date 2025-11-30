
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-amber-50/90 backdrop-blur-sm flex flex-col justify-center items-center z-50">
        <div className="relative">
            <div className="w-24 h-24 bg-pink-400 rounded-full animate-bounce absolute opacity-50 left-0 top-0 mix-blend-multiply filter blur-xl"></div>
            <div className="w-24 h-24 bg-yellow-400 rounded-full animate-bounce absolute opacity-50 right-0 top-0 mix-blend-multiply filter blur-xl animation-delay-200"></div>
            <div className="w-24 h-24 bg-cyan-400 rounded-full animate-bounce absolute opacity-50 left-4 bottom-0 mix-blend-multiply filter blur-xl animation-delay-400"></div>
            
            <div className="relative z-10 bg-white border-4 border-black rounded-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-spin-slow">
                 <svg className="h-16 w-16 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M12 4V2m0 20v-2m8-8h2M2 12h2m15.071-7.071l1.414-1.414m-1.414 1.414L17.657 6.343M6.343 17.657l-1.414 1.414m1.414-1.414L4.929 17.657m14.142 0l1.414 1.414m-1.414-1.414L17.657 17.657M6.343 6.343L4.929 4.929m1.414 1.414L6.343 6.343" />
                </svg>
            </div>
        </div>
      <p className="mt-8 text-black font-black text-2xl tracking-tight bg-white px-6 py-2 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_black]">Making magic happen... ✨</p>
    </div>
  );
};
