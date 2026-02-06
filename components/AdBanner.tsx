import React, { useEffect, useState, useRef } from 'react';

interface AdBannerProps {
  slotId: number;
  className?: string;
  fallbackVariant?: 'pro_plus' | 'single_unlock'; // Controls what fallback to show
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

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, className = '', fallbackVariant = 'pro_plus' }) => {
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
    const startTime = Date.now();
    checkInterval = window.setInterval(() => {
        const placeholder = document.getElementById(`ezoic-pub-ad-placeholder-${slotId}`);
        
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
      window.dispatchEvent(new CustomEvent('TRIGGER_PAYMENT_MODAL'));
  };

  // Fallback / Self-Promo View (Shown when ads fail/timeout/block)
  if (adStatus === 'error') {
    
    if (fallbackVariant === 'single_unlock') {
        // Post-Generation Fallback: Promote R100 Unlock
        return (
            <div className={`w-full flex justify-center items-center my-4 ${className}`}>
              <div 
                  onClick={triggerUpgrade}
                  className="group cursor-pointer relative w-full max-w-lg bg-gradient-to-r from-green-800 to-emerald-900 rounded-xl overflow-hidden shadow-lg border border-green-500/30 p-6 flex flex-col items-center text-center transition-transform hover:scale-[1.02]"
              >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                  <div className="relative z-10 space-y-2">
                      <div className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider mb-1">
                          Ready to Download?
                      </div>
                      <h3 className="text-xl font-bold text-white">Unlock This Document Now</h3>
                      <p className="text-emerald-100 text-sm max-w-xs mx-auto">
                          Get the editable Word file & Cover Letter immediately.
                      </p>
                      <div className="pt-3">
                          <span className="inline-block bg-white text-emerald-900 font-bold px-4 py-2 rounded-lg text-sm group-hover:bg-emerald-50 transition-colors">
                              Unlock for R100
                          </span>
                      </div>
                  </div>
              </div>
            </div>
        );
    }

    // Default / Pre-Generation Fallback: Promote Pro Plus (Subscription)
    return (
      <div className={`w-full flex justify-center items-center my-4 ${className}`}>
        <div 
            onClick={triggerUpgrade}
            className="group cursor-pointer relative w-full max-w-lg bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl overflow-hidden shadow-lg border border-indigo-500/30 p-6 flex flex-col items-center text-center transition-transform hover:scale-[1.02]"
        >
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            <div className="relative z-10 space-y-2">
                <div className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider mb-1">
                    Ad Loading Failed?
                </div>
                <h3 className="text-xl font-bold text-white">Get Pro Plus Access</h3>
                <p className="text-indigo-100 text-sm max-w-xs mx-auto">
                    Unlimited generations, unlimited downloads. Beat the ATS bots.
                </p>
                <div className="pt-3">
                    <span className="inline-block bg-white text-indigo-900 font-bold px-4 py-2 rounded-lg text-sm group-hover:bg-indigo-50 transition-colors">
                        Go Pro (30 Days+)
                    </span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Ezoic Container
  return (
    <div ref={adRef} className={`w-full flex justify-center items-center my-6 min-h-[90px] ${className}`}>
         <div id={`ezoic-pub-ad-placeholder-${slotId}`} className="w-full flex justify-center items-center"></div>
    </div>
  );
};