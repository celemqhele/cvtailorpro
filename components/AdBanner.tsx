import React from 'react';
import { Link } from 'react-router-dom';

interface AdBannerProps {
  className?: string;
  variant?: 'display' | 'in-feed' | 'multiplex' | 'internal';
  suffix?: string;
  format?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  className = '', 
  variant = 'display'
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

  // 2. Adsterra Native Ad Integration
  // Using iframe isolation to allow multiple instances of the same zone ID on a single page
  const adCode = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background-color: transparent; }</style>
    </head>
    <body>
        <script async="async" data-cfasync="false" src="https://pl28664313.effectivegatecpm.com/05a32a6fdab36952196ec714771c7fa8/invoke.js"></script>
        <div id="container-05a32a6fdab36952196ec714771c7fa8"></div>
    </body>
    </html>
  `;

  return (
    <div className={`flex flex-col items-center justify-center my-6 w-full ${className}`}>
        <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 select-none">Advertisement</div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden w-full flex justify-center items-center relative">
           <iframe 
             title="Adsterra Native Ad"
             srcDoc={adCode}
             className="w-full min-h-[300px]"
             style={{ border: 'none', overflow: 'hidden' }}
             scrolling="no"
           />
        </div>
    </div>
  );
};