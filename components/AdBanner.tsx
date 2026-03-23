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

  // 2. Placeholder for clean, Google-approved ads (e.g., AdSense)
  // Removed Adsterra script due to Google Ads "Compromised Site" policy violation.
  return (
    <div className={`flex flex-col items-center justify-center my-6 w-full ${className}`}>
        <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 select-none">Advertisement</div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden w-full flex justify-center items-center relative min-h-[300px] p-6 text-center">
           <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <div>
                <h4 className="text-slate-900 font-bold mb-1">Upgrade to Pro</h4>
                <p className="text-slate-500 text-sm max-w-xs">Get unlimited PDF downloads, Master Editor access, and zero interruptions.</p>
              </div>
              <Link to="/pricing" className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                View Plans
              </Link>
           </div>
        </div>
    </div>
  );
};