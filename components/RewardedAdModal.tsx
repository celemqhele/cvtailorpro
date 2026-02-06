import React, { useState, useEffect } from 'react';
import { AdBanner } from './AdBanner';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ isOpen, onClose, onComplete }) => {
  const VIDEO_DURATION = 15; // Duration in seconds that user must wait (simulating video length)
  const [timeLeft, setTimeLeft] = useState(VIDEO_DURATION);
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    
    if (isOpen) {
      // Reset state when opening
      setTimeLeft(VIDEO_DURATION);
      setCanDownload(false);

      // --- Countdown Timer ---
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanDownload(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <span className="text-white font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            Sponsored Session
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Ad Container */}
        <div className="w-full bg-black flex flex-col items-center justify-center p-6 min-h-[300px] relative">
           {!canDownload && (
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded border border-white/20 z-20">
                  Reward in {timeLeft}s
              </div>
           )}
           
           {/* Ad Content */}
           <div className="bg-white p-1 rounded w-full flex justify-center min-h-[250px] items-center relative z-10">
              <AdBanner slotId={106} fallbackVariant="single_unlock" /> 
           </div>
           
           <p className="text-slate-500 text-xs mt-4">
              {canDownload ? 'Thank you for supporting us!' : 'Please watch this message to unlock your download.'}
           </p>
        </div>

        {/* Footer / Controls */}
        <div className="w-full p-6 bg-slate-800 border-t border-slate-700 flex flex-col items-center gap-4">
          
          {/* Progress Bar */}
          <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
             <div 
               className={`h-full transition-all duration-1000 ease-linear ${canDownload ? 'bg-green-500' : 'bg-indigo-500'}`}
               style={{ width: `${((VIDEO_DURATION - timeLeft) / VIDEO_DURATION) * 100}%` }}
             />
          </div>

          <div className="w-full h-12 flex items-center justify-center">
            {canDownload ? (
               <button 
                 onClick={onComplete}
                 className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2 animate-bounce-subtle"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Download Now
               </button>
            ) : (
               <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
                 <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Unlocking Download...
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};