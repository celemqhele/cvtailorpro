
import React from 'react';
import { Button } from './Button';

interface SkeletonPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryIt: () => void;
}

export const SkeletonPromoModal: React.FC<SkeletonPromoModalProps> = ({ isOpen, onClose, onTryIt }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative border border-purple-200">
        {/* Header Graphic */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 h-32 relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 opacity-20 rounded-full blur-xl transform -translate-x-1/2 translate-y-1/2"></div>
            
            <div className="relative z-10 text-center text-white px-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h3 className="text-lg font-bold">Reverse Engineer the Job</h3>
            </div>
            
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Want to know exactly what the recruiter is looking for? <br/><br/>
                Use <strong>Skeleton Mode</strong> to generate the "Perfect Candidate" profile. It creates the ideal CV structure for the job with placeholders for your facts.
            </p>
            
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 text-slate-500 font-medium hover:text-slate-700 text-sm"
                >
                    Not Now
                </button>
                <Button 
                    onClick={onTryIt}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"
                >
                    Try Skeleton Mode
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
