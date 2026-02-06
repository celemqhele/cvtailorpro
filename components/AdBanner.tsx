import React, { useEffect, useState } from 'react';

interface AdBannerProps {
  slotId: number;
  className?: string;
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
    ezRewardedAds: {
      cmd: Array<() => void>;
      ready: boolean;
      requestWithOverlay: (
        callback: (result: { status: boolean; reward: boolean; msg?: string }) => void,
        uiOptions: { header: string; accept: string; cancel: string },
        rewardOptions: { rewardName: string; rewardOnNoFill: boolean }
      ) => void;
    };
    PaystackPop: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, className = '' }) => {
  const [showFallback, setShowFallback] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    // 1. Check if Ezoic is blocked immediately
    if (typeof window.ezstandalone === 'undefined') {
       // We wait a moment in case script loads slowly
       setTimeout(() => {
         if (typeof window.ezstandalone === 'undefined') {
           setShowFallback(true);
         }
       }, 2000);
    }

    // 2. Initialize Ezoic Ad
    if (window.ezstandalone) {
      try {
        window.ezstandalone.cmd.push(function() {
          // Define and Show the ad
          window.ezstandalone.define(slotId);
          window.ezstandalone.showAds(slotId);
        });
      } catch (e) {
        console.error("Ezoic Ad Error:", e);
      }
    }
  }, [slotId]);

  const handleDonate = (amount: number) => {
    const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30'; 
    const ref = 'DON-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: 'customerservice@goapply.co.za',
      amount: amount * 100, // ZAR to Cents
      currency: 'ZAR',
      ref: ref,
      metadata: {
        custom_fields: [
          {
            display_name: "Donation Type",
            variable_name: "donation_type",
            value: "Ad Fallback"
          }
        ]
      },
      callback: (response: any) => {
        setIsPaid(true);
        alert("Thank you for your support!");
      },
      onClose: () => {
        // do nothing
      }
    });
    
    paystack.openIframe();
  };

  if (isPaid) {
     return null; // Hide banner area if they donated this session
  }

  // Fallback View (Donation - Shows if AdBlocker is detected)
  if (showFallback) {
    return (
      <div className={`w-full flex justify-center items-center my-6 ${className}`}>
        <div className="bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-sm text-center max-w-lg w-full">
            <p className="text-sm font-semibold text-slate-700 mb-3">
               We notice you're using an AdBlocker. <br/>
               <span className="font-normal text-slate-500">Please consider a small donation to keep this tool free.</span>
            </p>
            <div className="flex justify-center gap-3">
                <button 
                  onClick={() => handleDonate(5)}
                  className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg transition-colors border border-indigo-200"
                >
                  R5
                </button>
                <button 
                  onClick={() => handleDonate(10)}
                  className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg transition-colors border border-indigo-200"
                >
                  R10
                </button>
                <button 
                  onClick={() => handleDonate(20)}
                  className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg transition-colors border border-indigo-200"
                >
                  R20
                </button>
            </div>
        </div>
      </div>
    );
  }

  // Ezoic Ad Placeholder with Visual Guide
  return (
    <div className={`w-full flex justify-center items-center my-6 ${className}`}>
        <div className="relative w-full flex justify-center items-center min-h-[90px] bg-slate-50 border-2 border-dashed border-indigo-200 rounded-lg p-2 overflow-hidden">
             {/* Visual Label for Development/Verification */}
             <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-300 pointer-events-none select-none z-0">
                 <p className="text-[10px] font-bold uppercase tracking-widest">Ad Placement</p>
                 <p className="text-[9px] font-mono">Slot {slotId}</p>
             </div>
             
             {/* Actual Ezoic Div - Scripts inject content here */}
             <div id={`ezoic-pub-ad-placeholder-${slotId}`} className="relative z-10 w-full flex justify-center items-center min-h-[90px]"></div>
        </div>
    </div>
  );
};