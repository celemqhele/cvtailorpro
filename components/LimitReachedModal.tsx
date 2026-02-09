
import React from 'react';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onUpgrade: () => void;
  isMaxPlan: boolean;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ 
  isOpen, 
  onClose, 
  onWatchAd, 
  onUpgrade,
  isMaxPlan 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative border border-slate-200">
        
        {/* Header Icon */}
        <div className="bg-amber-500 h-20 w-full relative flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90"></div>
             <div className="relative z-10 bg-white p-3 rounded-full shadow-lg">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>

        <div className="p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-slate-800">Daily Limit Reached</h3>
            
            <p className="text-slate-600 text-sm leading-relaxed">
                You have used all your CV generations for today.
                <br/>
                <span className="font-semibold text-slate-800 mt-2 block">How would you like to proceed?</span>
            </p>

            <div className="pt-2 space-y-3">
                <button 
                    onClick={onWatchAd}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Watch Ad for 1 Free Credit
                </button>
                
                {!isMaxPlan && (
                  <button 
                      onClick={onUpgrade}
                      className="w-full py-3 bg-white border-2 border-amber-500 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-all text-sm flex items-center justify-center gap-2"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Upgrade Plan
                  </button>
                )}
                
                {isMaxPlan && (
                  <p className="text-[10px] text-slate-400">You are on the highest tier. Watch ads for extra credits.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};