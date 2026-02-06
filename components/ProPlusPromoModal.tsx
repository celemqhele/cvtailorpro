import React from 'react';
import { Button } from './Button';

interface ProPlusPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ProPlusPromoModal: React.FC<ProPlusPromoModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative border-2 border-indigo-100">
        
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-600 to-violet-600"></div>
        
        <div className="relative pt-8 px-6 pb-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-indigo-50 mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">Unlock the Full Bundle?</h3>
            <p className="text-slate-600 mb-6">
                You just downloaded the CV, but <strong>Pro Plus</strong> gives you the complete application package.
            </p>

            <div className="bg-indigo-50 rounded-xl p-4 text-left space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span><strong>Editable Word</strong> (.docx) Format</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span>Includes <strong>Tailored Cover Letter</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span><strong>No Ads</strong> & Unlimited Use</span>
                </div>
            </div>

            <div className="space-y-3">
                <Button onClick={onUpgrade} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    Get Pro Plus
                </Button>
                <button onClick={onClose} className="text-slate-400 text-sm hover:text-slate-600 font-medium">
                    No thanks, I'll stick to PDF
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};