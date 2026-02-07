import React from 'react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSupport: () => void;
  onContinueFree: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onConfirmSupport, onContinueFree }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative border border-slate-200">
        
        {/* Header Image/Icon */}
        <div className="bg-indigo-600 h-24 w-full relative flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
             <div className="relative z-10 bg-white p-3 rounded-full shadow-lg">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             </div>
             {/* Close button */}
             <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>

        <div className="p-6 text-center space-y-4">
            <h3 className="text-2xl font-bold text-slate-800">Support This Site?</h3>
            
            <p className="text-slate-600 text-sm leading-relaxed">
                We keep this tool free by running ads, but you can support us by purchasing the <strong>Editable Word (.docx)</strong> version for just <strong>R20</strong>.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl text-left space-y-2 border border-slate-100 shadow-inner">
                 <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span>Download Editable Word Format</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span>Skip the Video Ad</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="bg-green-100 p-1 rounded-full"><svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <span>Keep CV Tailor Pro Running! ❤️</span>
                 </div>
            </div>
            
            <div className="pt-2 space-y-3">
                <button 
                    onClick={onConfirmSupport}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    Yes, I'll Support (R20)
                </button>
                
                <button 
                    onClick={onContinueFree}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-all text-sm"
                >
                    No thanks, show me the Ad
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};