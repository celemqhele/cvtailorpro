
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('cookie_consent');
    }
    return false;
  });

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 shadow-lg z-[100] animate-fade-in border-t border-slate-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          <p className="font-bold text-white mb-1">We use cookies</p>
          <p>
            We use cookies to analyze traffic, show personalized ads (via Google AdSense), and improve your experience. 
            By continuing, you agree to our use of cookies as described in our <Link to="/privacy-policy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
           <button 
             onClick={acceptCookies}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm"
           >
             Accept
           </button>
        </div>
      </div>
    </div>
  );
};
