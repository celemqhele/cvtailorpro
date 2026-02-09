
import React, { useState, useEffect } from 'react';
import { AdBanner } from './AdBanner';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ isOpen, onClose, onComplete }) => {
  const DURATION = 10; // 10 Seconds as requested
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    
    if (isOpen) {
      // Reset state when opening
      setTimeLeft(DURATION);
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <span className="text-white font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            Sponsor Message
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Ad Container */}
        <div className="w-full bg-black flex flex-col items-center justify-center p-6 min-h-[350px]">
           <p className="text-slate-400 text-sm mb-4">Your content is unlocking in {timeLeft}s...</p>
           
           {/* Display Ad is most appropriate for a modal/rectangle slot */}
           <div className="bg-white p-2 rounded w-full flex justify-center items-center min-h-[280px] overflow-hidden">
              <AdBanner variant="display" suffix="reward" className="!my-0" /> 
           </div>
        </div>

        {/* Footer / Controls */}
        <div className="w-full p-6 bg-slate-800 border-t border-slate-700 flex flex-col items-center gap-4">
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
             <div 
               className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
               style={{ width: `${((DURATION - timeLeft) / DURATION) * 100}%` }}
             />
          </div>

          <div className="w-full">
            {canDownload ? (
               <button 
                 onClick={onComplete}
                 className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2 animate-bounce-subtle"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 View CV
               </button>
            ) : (
               <button 
                 disabled
                 className="w-full py-3 bg-slate-700 text-slate-400 font-medium rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
               >
                 <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Please wait {timeLeft}s...
               </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
