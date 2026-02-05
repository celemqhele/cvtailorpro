import React, { useEffect } from 'react';

interface AdBannerProps {
  slotId: number;
  className?: string;
}

declare global {
  interface Window {
    ezstandalone: {
      cmd: any[];
      showAds: (...args: any[]) => void;
      destroyPlaceholders: (...args: any[]) => void;
      destroyAll: () => void;
    };
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, className = '' }) => {
  useEffect(() => {
    if (window.ezstandalone) {
      // Ensure the command is pushed to the Ezoic queue
      window.ezstandalone.cmd.push(function () {
        // Show the specific ad slot
        window.ezstandalone.showAds(slotId);
      });
    }

    // Cleanup: Destroy placeholder when component unmounts to prevent conflicts in SPA
    return () => {
      if (window.ezstandalone) {
        window.ezstandalone.cmd.push(function () {
          window.ezstandalone.destroyPlaceholders(slotId);
        });
      }
    };
  }, [slotId]);

  return (
    <div className={`w-full flex justify-center items-center my-6 min-h-[90px] ${className}`}>
      {/* Ezoic Ad Placeholder - DO NOT STYLE THIS DIV DIRECTLY */}
      <div id={`ezoic-pub-ad-placeholder-${slotId}`}></div>
    </div>
  );
};