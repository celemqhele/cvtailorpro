import React from 'react';
import { Button } from './Button';

interface FeatureLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title: string;
  description: string;
}

export const FeatureLockedModal: React.FC<FeatureLockedModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  title, 
  description 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center relative border border-slate-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-8 leading-relaxed text-sm">
            {description}
        </p>

        <Button 
            onClick={onUpgrade}
            className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 mb-3"
        >
            Upgrade to Unlock
        </Button>
        
        <button 
            onClick={onClose}
            className="text-xs text-slate-400 font-bold hover:text-slate-600 uppercase tracking-wide"
        >
            Maybe Later
        </button>
      </div>
    </div>
  );
};