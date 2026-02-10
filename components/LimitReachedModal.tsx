
import React from 'react';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onUpgrade: (withDiscount: boolean) => void;
  isMaxPlan: boolean;
  isPaidUser: boolean;
  eligibleForDiscount?: boolean;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ 
  isOpen, 
  onClose, 
  onWatchAd, 
  onUpgrade,
  isMaxPlan,
  isPaidUser,
  eligibleForDiscount = false
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
                You have used all your free CV generations for today (5/5).
            </p>

            {eligibleForDiscount && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 my-2 animate-bounce-subtle">
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Limited Time Offer</p>
                    <p className="text-lg font-extrabold text-indigo-600">Get 50% OFF Pro Plans</p>
                    <p className="text-xs text-indigo-500">Remove ads & increase limits instantly.</p>
                </div>
            )}
            
            {!eligibleForDiscount && (
                 <p className="font-semibold text-slate-800 text-sm">Upgrade now to continue creating.</p>
            )}

            <div className="pt-2 space-y-3">
                {!isMaxPlan && (
                  <button 
                      onClick={() => onUpgrade(eligibleForDiscount)}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-sm flex items-center justify-center gap-2 transform active:scale-95"
                  >
                      {eligibleForDiscount ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                            Claim 50% Discount
                          </>
                      ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            {isPaidUser ? 'Upgrade to Higher Tier' : 'Upgrade Plan'}
                          </>
                      )}
                  </button>
                )}
                
                {isMaxPlan && (
                  <p className="text-[10px] text-slate-400">You are on the highest tier. Limit reached.</p>
                )}

                <button 
                    onClick={onClose}
                    className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm font-medium"
                >
                    Close
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
