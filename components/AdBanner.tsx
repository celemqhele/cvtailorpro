
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AdBannerProps {
  className?: string;
  suffix?: string;
  format?: 'horizontal' | 'rectangle';
  type?: 'external' | 'internal'; // New prop to switch between Ad networks and Self-promo
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  className = '', 
  suffix = '', 
  format = 'horizontal',
  type = 'external' 
}) => {
  
  // Internal Ad (Promoting Pro Plan)
  if (type === 'internal') {
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

  // External Ad (Google AdSense)
  useEffect(() => {
      try {
          // Initialize AdSense
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
          // AdBlockers might trigger this, silent fail
      }
  }, []);

  return (
    <div 
        className={`flex flex-col items-center justify-center my-6 ${className}`}
        style={{ width: '100%' }}
    >
        <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 select-none">Advertisement</div>
        <div 
            className="bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ 
              width: format === 'rectangle' ? '100%' : '100%', 
              maxWidth: format === 'rectangle' ? '336px' : '100%', 
              minHeight: format === 'rectangle' ? '280px' : '100px',
              display: 'block'
            }}
        >
           {/* Google AdSense Unit */}
           {/* Note: data-ad-slot needs to be updated with a real ID from your AdSense Dashboard */}
           <ins className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '100%' }}
                data-ad-client="ca-pub-6881973057585692"
                data-ad-slot="1234567890" 
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    </div>
  );
};
