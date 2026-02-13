
import React from 'react';

interface AdDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onUpgrade: () => void;
}

export const AdDecisionModal: React.FC<AdDecisionModalProps> = ({ isOpen, onClose, onWatchAd, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative border border-slate-200">
        
        {/* Header Icon */}
        <div className="bg-indigo-600 h-24 w-full relative flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
             <div className="relative z-10 bg-white p-3 rounded-full shadow-lg">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>

        <div className="p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-slate-800">Generate Tailored CV</h3>
            
            <p className="text-slate-600 text-sm leading-relaxed">
                You're using the free version. Support us by watching a short ad to unlock this generation, or upgrade to skip ads forever.
            </p>

            <div className="pt-4 space-y-3">
                {/* Upgrade Option (Primary) */}
                <button 
                    onClick={onUpgrade}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-between px-6 group transform active:scale-95"
                >
                    <div className="text-left">
                        <div className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Fast Track</div>
                        <div className="text-base">Upgrade to Pro</div>
                    </div>
                    <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                </button>
                
                {/* Watch Ad Option (Secondary) */}
                <button 
                    onClick={onWatchAd}
                    className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Watch Ad (10s)
                </button>
            </div>
            
            <button onClick={onClose} className="text-slate-400 text-xs hover:text-slate-600 mt-2">Cancel</button>
        </div>
      </div>
    </div>
  );
};
