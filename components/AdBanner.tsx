import React, { useMemo } from 'react';

interface AdBannerProps {
  slotId?: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotId, className = '' }) => {
  // Define internal fallback ads (Spotify style: Colorful, clean, bold)
  const internalAds = [
    {
      title: "Land Your Dream Job",
      text: "Tailored CVs get 3x more interviews. You're on the right track!",
      bgColor: "bg-gradient-to-r from-purple-900 to-indigo-900",
      textColor: "text-white",
      icon: "🚀",
      accent: "bg-white/10"
    },
    {
      title: "Keep Us Running",
      text: "We run on coffee and cloud credits. A small donation goes a long way.",
      bgColor: "bg-gradient-to-r from-emerald-800 to-teal-900",
      textColor: "text-white",
      icon: "☕",
      accent: "bg-white/10"
    },
    {
      title: "Privacy First",
      text: "We don't store your data. Your CV is processed securely in memory.",
      bgColor: "bg-gradient-to-r from-slate-800 to-gray-900",
      textColor: "text-white",
      icon: "🔒",
      accent: "bg-white/10"
    }
  ];

  // Randomly select an ad on mount to keep it stable during re-renders unless component unmounts
  const ad = useMemo(() => {
    return internalAds[Math.floor(Math.random() * internalAds.length)];
  }, []);

  return (
    <div className={`w-full max-w-4xl mx-auto my-6 ${className}`}>
      {/* 
         Since we don't have a real ad network script active, 
         we default to showing our "Spotify-style" internal ads.
      */}
      <div className={`${ad.bgColor} ${ad.textColor} rounded-xl p-6 shadow-lg flex items-center justify-between relative overflow-hidden group`}>
        
        {/* Background Accent */}
        <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full ${ad.accent} blur-3xl group-hover:blur-2xl transition-all duration-700`}></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-12 h-12 flex items-center justify-center text-3xl bg-white/10 rounded-full backdrop-blur-sm shadow-inner">
            {ad.icon}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Sponsored</div>
            <h3 className="font-bold text-lg leading-tight mb-1">{ad.title}</h3>
            <p className="text-sm opacity-90 font-light max-w-lg">{ad.text}</p>
          </div>
        </div>

        {/* Optional decorative element on the right */}
        <div className="hidden md:block opacity-20 transform group-hover:scale-110 transition-transform duration-500">
           <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        </div>
      </div>
    </div>
  );
};