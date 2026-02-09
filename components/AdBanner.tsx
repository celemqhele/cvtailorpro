
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AdBannerProps {
  className?: string;
  variant?: 'display' | 'in-feed' | 'multiplex' | 'internal';
  suffix?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  className = '', 
  variant = 'display',
  suffix
}) => {
  
  // 1. Internal Ad (Promoting Pro Plan)
  if (variant === 'internal') {
    return (
      <div className={`w-full max-w-4xl mx-auto my-8 ${className}`}>
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-500/30">
           <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                 <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Pro Tip</span>
                 <h4 className="text-white font-bold text-lg">Tired of Ads?</h4>
              </div>
              <p className="text-indigo-100 text-sm">
                Upgrade to CV Tailor Pro for unlimited downloads, higher match scores, and a distraction-free experience.
              </p>
           </div>
           <Link 
             to="/pricing"
             className="whitespace-nowrap px-6 py-3 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-md text-sm"
           >
             Remove Ads & Upgrade
           </Link>
        </div>
      </div>
    );
  }

  // 2. Google AdSense Units
  useEffect(() => {
      try {
          // Initialize AdSense push
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
          // AdBlockers might trigger this, silent fail
      }
  }, [suffix]);

  const renderAdUnit = () => {
      switch (variant) {
          case 'in-feed':
              return (
                /* In-Feed Ad */
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-format="fluid"
                     data-ad-layout-key="-6y+d5+52-1c-7g"
                     data-ad-client="ca-pub-6881973057585692"
                     data-ad-slot="1208769022"></ins>
              );
          case 'multiplex':
              return (
                /* Multiplex Ad */
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-format="autorelaxed"
                     data-ad-client="ca-pub-6881973057585692"
                     data-ad-slot="2540461759"></ins>
              );
          case 'display':
          default:
              return (
                /* Display Ad */
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-client="ca-pub-6881973057585692"
                     data-ad-slot="1418951775"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
              );
      }
  };

  return (
    <div className={`flex flex-col items-center justify-center my-6 w-full ${className}`}>
        <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 select-none">Advertisement</div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden w-full flex justify-center min-h-[100px]" key={suffix}>
           {renderAdUnit()}
        </div>
    </div>
  );
};
