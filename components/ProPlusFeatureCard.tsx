
import React from 'react';
import { Link } from 'react-router-dom';

interface ProPlusFeatureCardProps {
  onUpgrade?: () => void;
  className?: string;
  minimal?: boolean;
}

export const ProPlusFeatureCard: React.FC<ProPlusFeatureCardProps> = ({ onUpgrade, className = '', minimal = false }) => {
  if (minimal) {
    return (
      <div className={`bg-indigo-900 rounded-xl p-4 text-white shadow-md flex items-center justify-between gap-4 ${className}`}>
         <div>
            <h4 className="font-bold text-sm text-indigo-100">Upgrade Plan</h4>
            <p className="text-xs text-indigo-300">Remove ads & increase daily limits.</p>
         </div>
         <Link 
          to="/pricing"
          className="px-3 py-1.5 bg-white text-indigo-900 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          View Plans
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-20 h-20 bg-indigo-500 opacity-20 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm">Power User</span>
        </div>
        <h3 className="text-xl font-bold mb-2">Generate More CVs</h3>
        <ul className="space-y-1 mb-5">
            <li className="flex items-center gap-2 text-sm text-indigo-100">
                <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Up to Unlimited Generations
            </li>
            <li className="flex items-center gap-2 text-sm text-indigo-100">
                <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                100% Ad-Free Experience
            </li>
            <li className="flex items-center gap-2 text-sm text-indigo-100">
                <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                Style Matching (Upload Refs)
            </li>
             <li className="flex items-center gap-2 text-sm text-indigo-100">
                <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Valid for 30 Days
            </li>
        </ul>
        
        <Link 
          to="/pricing"
          className="w-full py-3 bg-white text-indigo-700 font-bold rounded-lg shadow-sm hover:bg-indigo-50 transition-colors text-sm flex items-center justify-center gap-2"
        >
          View Pricing
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      </div>
    </div>
  );
};
