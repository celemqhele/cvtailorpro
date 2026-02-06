import React, { useEffect, useState } from 'react';

interface AccessState {
  isBlocked: boolean;
  reason: 'ADBLOCK' | 'VPN' | null;
  details?: string;
}

export const AccessControl: React.FC = () => {
  const [access, setAccess] = useState<AccessState>({ isBlocked: false, reason: null });
  const [isLoading, setIsLoading] = useState(true);

  const checkAdBlocker = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Method 1: HTML Bait
      // Adblockers usually hide elements with these class names
      const bait = document.createElement('div');
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads ad-banner adsbox';
      bait.setAttribute('style', 'color: transparent; position: absolute; top: -1000px; left: -1000px;');
      document.body.appendChild(bait);

      // Method 2: Network Bait
      // Try to fetch a known ad script (Google Ads)
      const networkCheck = fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      }).then(() => false).catch(() => true);

      setTimeout(() => {
        const style = window.getComputedStyle(bait);
        const isHidden = 
          style.display === 'none' || 
          style.visibility === 'hidden' || 
          bait.offsetHeight === 0 || 
          bait.offsetParent === null;
        
        document.body.removeChild(bait);

        networkCheck.then((networkBlocked) => {
           // If Ezoic is missing but expected, that's also a sign
           const ezoicMissing = typeof window.ezstandalone === 'undefined';
           
           if (isHidden || networkBlocked) {
             resolve(true);
           } else {
             resolve(false);
           }
        });
      }, 200);
    });
  };

  const checkVPN = async (): Promise<boolean> => {
    try {
      // We use a free IP lookup service
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) return false; // Fail open if API is down
      
      const data = await response.json();
      
      // Heuristic 1: Timezone Mismatch
      // Proxies often have IP timezones that don't match the browser's system time
      if (data.utc_offset) {
        const ipOffsetString = data.utc_offset; // e.g., "+0200"
        const ipHours = parseInt(ipOffsetString.substring(0, 3));
        const ipMinutes = parseInt(ipOffsetString.substring(3, 5));
        const totalIpOffsetMinutes = (ipHours * 60) + (ipHours < 0 ? -ipMinutes : ipMinutes);
        
        // Browser offset (returns negative for East, positive for West, minutes)
        // We invert it to match ISO standard
        const browserOffset = -new Date().getTimezoneOffset();
        
        // Allow for 2 hours of difference (DST handling etc)
        const diff = Math.abs(totalIpOffsetMinutes - browserOffset);
        
        if (diff > 120) {
            console.log("VPN Detected: Timezone mismatch");
            return true;
        }
      }

      // Heuristic 2: Known Hosting Providers (Basic Check)
      // This is less reliable on free APIs, but we check org name for obvious ones
      const org = (data.org || '').toLowerCase();
      const blockedISPs = ['vpn', 'hosting', 'datacenter', 'proxy', 'tor exit'];
      if (blockedISPs.some(t => org.includes(t))) {
          console.log("VPN Detected: Hosting Provider");
          return true;
      }

      return false;
    } catch (e) {
      console.error("VPN Check failed", e);
      return false; // Fail open
    }
  };

  const runChecks = async () => {
    setIsLoading(true);
    
    // 1. Check AdBlocker
    const isAdBlocked = await checkAdBlocker();
    if (isAdBlocked) {
        setAccess({ isBlocked: true, reason: 'ADBLOCK' });
        setIsLoading(false);
        return;
    }

    // 2. Check VPN
    // We delay this slightly to let initial render happen
    const isVPN = await checkVPN();
    if (isVPN) {
        setAccess({ isBlocked: true, reason: 'VPN' });
        setIsLoading(false);
        return;
    }

    setAccess({ isBlocked: false, reason: null });
    setIsLoading(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  if (!access.isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 animate-fade-in border-4 border-indigo-100">
        
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          {access.reason === 'ADBLOCK' ? (
             <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          ) : (
             <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.59-4.181m-3.296 15.91a21.92 21.92 0 005.782-2.488" /></svg>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {access.reason === 'ADBLOCK' ? 'Ad Blocker Detected' : 'VPN or Proxy Detected'}
          </h2>
          <p className="text-slate-600 leading-relaxed">
            {access.reason === 'ADBLOCK' 
              ? "We rely on ads to keep this CV tool completely free for everyone. Please support us by disabling your ad blocker." 
              : "For security reasons and to ensure fair usage of our free tools, we do not allow access via VPNs, Proxies, or Anonymizers. Please turn off your VPN to continue."}
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          I've Disabled It - Refresh Page
        </button>

        <p className="text-xs text-slate-400">
           {access.reason === 'ADBLOCK' ? 'If you have already disabled it, try clearing your cache.' : 'If you believe this is an error, please ensure your system time matches your location.'}
        </p>
      </div>
    </div>
  );
};