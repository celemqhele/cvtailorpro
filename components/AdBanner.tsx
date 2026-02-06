import React, { useEffect, useState, useRef } from 'react';

interface AdBannerProps {
  slotId: number;
  className?: string;
  fallbackType?: 'subscription' | 'single';
}

declare global {
  interface Window {
    ezstandalone: {
      cmd: Array<() => void>;
      showAds: (placeholderId: number) => void;
      define: (placeholderId: number) => void;
      hasAd: (placeholderId: number) => boolean;
      initRewardedAds: () => void;
    };
    // Custom event for internal communication without prop drilling
    dispatchEvent: (event: Event) => boolean;
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, className = '', fallbackType = 'subscription' }) => {
  const [adStatus, setAdStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let checkInterval: number | undefined;
    
    // 1. Initialize Ezoic Ad
    if (typeof window.ezstandalone !== 'undefined') {
      try {
        window.ezstandalone.cmd.push(function() {
          window.ezstandalone.define(slotId);
          window.ezstandalone.showAds(slotId);
        });
      } catch (e) {
        console.error("Ezoic define error:", e);
        setAdStatus('error');
      }
    } else {
        // If script isn't loaded after a short delay (e.g. strict blocker), fail
        setTimeout(() => {
            if (typeof window.ezstandalone === 'undefined') {
                setAdStatus('error');
            }
        }, 3000);
    }

    // 2. Poll for Ad Render Success
    // We check if the placeholder div gets populated with content (height > 0)
    const startTime = Date.now();
    checkInterval = window.setInterval(() => {
        const placeholder = document.getElementById(`ezoic-pub-ad-placeholder-${slotId}`);
        
        // Success Criteria: Div has content/height
        // Note: Ezoic sometimes puts a 0-height div if no fill, but usually we want to treat no-fill as error/fallback too
        if (placeholder && (placeholder.clientHeight > 15 || placeholder.innerText.length > 0)) {
            setAdStatus('loaded');
            if (checkInterval) clearInterval(checkInterval);
        }

        // Timeout: If not loaded after 4 seconds, show fallback
        if (Date.now() - startTime > 4000) {
            if (adStatus !== 'loaded') {
                setAdStatus('error');
            }
            if (checkInterval) clearInterval(checkInterval);
        }
    }, 500);

    return () => {
        if (checkInterval) clearInterval(checkInterval);
    };
  }, [slotId]);

  const triggerUpgrade = () => {
      // Dispatch custom event to open Payment Modal (listened in App.tsx) with specific mode
      window.dispatchEvent(new CustomEvent('TRIGGER_PAYMENT_MODAL', {
          detail: { mode: fallbackType }
      }));
  };

  // Fallback / Self-Promo View (Shown when ads fail/timeout/block)
  if (adStatus === 'error') {
    return (
      <div className={`w-full flex justify-center items-center my-4 ${className}`}>
        <div 
            onClick={triggerUpgrade}
            className="group cursor-pointer relative w-full max-w-lg bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg border border-indigo-500/30 p-6 flex flex-col items-center text-center transition-transform hover:scale-[1.02]"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            
            <div className="relative z-10 space-y-2">
                <div className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider mb-1">
                    Ad Loading Failed?
                </div>
                
                {fallbackType === 'subscription' ? (
                    <>
                        <h3 className="text-xl font-bold text-white">Upgrade to CV Tailor Pro</h3>
                        <p className="text-indigo-100 text-sm max-w-xs mx-auto">
                            Skip the wait. Get unlimited downloads & Cover Letters instantly.
                        </p>
                        <div className="pt-3">
                            <span className="inline-block bg-white text-indigo-900 font-bold px-4 py-2 rounded-lg text-sm group-hover:bg-indigo-50 transition-colors">
                                View Plans
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                         <h3 className="text-xl font-bold text-white">Unlock This Application</h3>
                         <p className="text-indigo-100 text-sm max-w-xs mx-auto">
                             Get the Editable Word Doc + Professional Cover Letter.
                         </p>
                         <div className="pt-3">
                             <span className="inline-block bg-white text-indigo-900 font-bold px-4 py-2 rounded-lg text-sm group-hover:bg-indigo-50 transition-colors">
                                 Unlock for R100
                             </span>
                         </div>
                    </>
                )}
            </div>
        </div>
      </div>
    );
  }

  // Ezoic Container
  return (
    <div ref={adRef} className={`w-full flex justify-center items-center my-6 min-h-[90px] ${className}`}>
         {/* The visual border is removed here so it looks cleaner when empty/loading, 
             or matches the ad size exactly when loaded */}
         <div id={`ezoic-pub-ad-placeholder-${slotId}`} className="w-full flex justify-center items-center"></div>
    </div>
  );
};