import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Paystack global definition
declare global {
  interface Window {
    PaystackPop: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(null);
    }
  }, [isOpen]);

  // Handle countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      onClose();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onClose]);

  if (!isOpen) return null;

  const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30';
  const USER_EMAIL = 'supporter@cvtailor.pro'; // Placeholder email for donation

  const handleDonation = (amountInRands: number) => {
    // If user decides to donate during countdown, cancel countdown
    setCountdown(null);

    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: USER_EMAIL,
      amount: amountInRands * 100, // Convert to cents (kobo)
      currency: 'ZAR',
      ref: '' + Math.floor((Math.random() * 1000000000) + 1),
      onClose: () => {
        // User closed payment modal
      },
      callback: (response: any) => {
        // Payment complete
        alert('Thank you so much for your support! It keeps this tool running.');
        onClose();
      }
    });
    
    paystack.openIframe();
  };

  const handleSkip = () => {
    setCountdown(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative overflow-hidden">
        
        {/* Decorative background circle */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full opacity-50 blur-xl"></div>

        <div className="text-center space-y-4 relative z-10">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800">Support CV Tailor Pro</h3>
          <p className="text-slate-600">
            We hope your new CV helps you land that dream job! <br/>
            If you found this tool useful, please consider a small donation to help us cover server costs.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <button 
              onClick={() => handleDonation(20)}
              className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl transition-all flex items-center justify-between group"
            >
              <span>☕ Buy us a coffee</span>
              <span className="bg-white px-2 py-1 rounded-md text-sm shadow-sm group-hover:scale-105 transition-transform">R20</span>
            </button>

            <button 
              onClick={() => handleDonation(50)}
              className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl transition-all flex items-center justify-between group"
            >
              <span>🚀 Fuel the server</span>
              <span className="bg-white px-2 py-1 rounded-md text-sm shadow-sm group-hover:scale-105 transition-transform">R50</span>
            </button>

            <button 
              onClick={() => handleDonation(100)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-between group"
            >
              <span>💎 Become a Super Fan</span>
              <span className="bg-white/20 px-2 py-1 rounded-md text-sm backdrop-blur-sm group-hover:scale-105 transition-transform">R100</span>
            </button>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSkip}
              disabled={countdown !== null}
              className={`text-sm font-medium transition-colors ${countdown !== null ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {countdown !== null 
                ? `Closing in ${countdown}...` 
                : "No thanks, maybe next time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};