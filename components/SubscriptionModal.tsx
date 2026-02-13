
import React from 'react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] relative overflow-hidden flex flex-col">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 z-10 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header Content */}
        <div className="pt-6 px-6 text-center shrink-0">
            <h3 className="text-xl font-bold text-slate-800">Don't Miss Out!</h3>
            <p className="text-slate-500 text-sm mt-1">Get alerted when new jobs matching your skills are posted.</p>
        </div>

        {/* Brevo Iframe */}
        <div className="w-full flex justify-center p-2">
            <iframe 
                width="540" 
                height="305" 
                src="https://8604898e.sibforms.com/serve/MUIFAIY9FWoMTqnzi-nzn65Fzn-Szuq50Ar_6D9_js-XPRpJ116z4gUUkWjJWkqN093h7v1LA9GeikodoU4lm4z8ApoQFTsQnyYQo0NnknNJMG6GQKlXJE8zJ3kWM7V8seEFaXAnM1mSW7vnUbFHtEuBoIfRYnRbsI2jDUezAv5tjZ6tAqnfeWzAyEdvYuF1nCB4sUiUo0nYcQWjAQ==" 
                frameBorder="0" 
                scrolling="auto" 
                allowFullScreen 
                style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%' }}
                title="Job Alerts Subscription"
            ></iframe>
        </div>
      </div>
    </div>
  );
};
