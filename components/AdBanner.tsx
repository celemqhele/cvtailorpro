
import React from 'react';
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

  // External Ad (Adsterra / PropellerAds)
  // Dimensions based on format
  const width = format === 'rectangle' ? '300px' : '100%';
  const height = format === 'rectangle' ? '250px' : '90px'; // Standard Leaderboard height

  // HTML content for the iframe (Sandboxed Ad)
  // REPLACE THE SCRIPT BELOW WITH YOUR SPECIFIC ADSTERRA CODE
  const adHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background-color: transparent; }
      </style>
    </head>
    <body>
      <!-- PLACE YOUR ADSTERRA / AD NETWORK SCRIPT HERE -->
      <!-- Example placeholder for existing script -->
      <div id="container-05a32a6fdab36952196ec714771c7fa8"></div>
      <script src="https://pl28664313.effectivegatecpm.com/05a32a6fdab36952196ec714771c7fa8/invoke.js" async data-cfasync="false"></script>
      <!-- END AD SCRIPT -->
    </body>
    </html>
  `;

  return (
    <div 
        className={`flex flex-col items-center justify-center my-6 ${className}`}
        style={{ width: '100%' }}
    >
        <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 select-none">Advertisement</div>
        <div 
            className="bg-slate-100 border border-slate-200 rounded-lg relative overflow-hidden flex items-center justify-center"
            style={{ 
              width: format === 'rectangle' ? '320px' : '100%', 
              maxWidth: format === 'rectangle' ? '320px' : '728px', // Leaderboard max width
              height: format === 'rectangle' ? '280px' : '110px' 
            }}
        >
           <iframe
               title={`ad-${suffix}`}
               srcDoc={adHtml}
               width="100%"
               height="100%"
               scrolling="no"
               frameBorder="0"
               style={{ border: 'none', overflow: 'hidden' }}
           />
        </div>
    </div>
  );
};
