import React from 'react';

interface AdBannerProps {
  className?: string;
  suffix?: string;
  format?: 'horizontal' | 'rectangle';
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '', suffix = '', format = 'horizontal' }) => {
  
  // Define dimensions based on format
  // Rectangle (300x250) -> Container ~320x280
  // Horizontal (320x50 or 468x60 or 728x90) -> Container ~Height 120px
  
  const width = format === 'rectangle' ? '320px' : '100%';
  const height = format === 'rectangle' ? '280px' : '120px';
  const iframeHeight = format === 'rectangle' ? '260' : '100'; // Slightly smaller than container

  // HTML content for the iframe
  // We use the exact ID the script expects inside the isolated iframe environment.
  const adHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background-color: transparent; font-family: sans-serif; }
        #container-05a32a6fdab36952196ec714771c7fa8 { text-align: center; }
      </style>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6881973057585692"
     crossorigin="anonymous"></script>
    </head>
    <body>
      <div id="container-05a32a6fdab36952196ec714771c7fa8"></div>
      <script type="text/javascript">
         // Adsterra / PropellerAds config if needed, though the invoke script usually handles it.
      </script>
      <script src="https://pl28664313.effectivegatecpm.com/05a32a6fdab36952196ec714771c7fa8/invoke.js" async data-cfasync="false"></script>
    </body>
    </html>
  `;

  return (
    <div 
        className={`flex flex-col items-center justify-center my-4 ${className}`}
        style={{ width: '100%', maxWidth: format === 'rectangle' ? '340px' : '100%' }} // Outer constraint
    >
        {/* Dedicated Placeholder Box */}
        <div 
            className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl relative overflow-hidden flex flex-col items-center"
            style={{ width: width, height: height }}
        >
           {/* Label */}
           <div className="w-full bg-slate-200 text-slate-500 text-[10px] uppercase font-bold text-center py-1 mb-1 z-10 select-none">
              Advertisement
           </div>
           
           {/* Ad Iframe */}
           <iframe
               title={`ad-${suffix}`}
               srcDoc={adHtml}
               width="100%"
               height={iframeHeight}
               scrolling="no"
               frameBorder="0"
               style={{ border: 'none', overflow: 'hidden' }}
           />
        </div>
    </div>
  );
};