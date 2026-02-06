import React from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  documentTitle: string;
}

// Paystack global definition
declare global {
  interface Window {
    PaystackPop: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, documentTitle }) => {
  if (!isOpen) return null;

  const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30'; 
  const PRICE_ZAR = 100;

  const handlePayment = () => {
    const uniqueRef = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: 'customer@cvtailor.pro', // Placeholder, or ask user for email
      amount: PRICE_ZAR * 100, // In cents (kobo)
      currency: 'ZAR',
      ref: uniqueRef,
      onClose: () => {
        // User closed modal
      },
      callback: (response: any) => {
        // Payment complete
        onSuccess(uniqueRef);
      }
    });
    
    paystack.openIframe();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden relative">
        
        <div className="bg-indigo-600 p-6 text-center">
            <h3 className="text-2xl font-bold text-white">Unlock Download</h3>
            <p className="text-indigo-100 text-sm mt-1">Get your professional Word documents</p>
        </div>

        <div className="p-8 text-center space-y-6">
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Item</p>
             <p className="text-slate-800 font-medium">{documentTitle}</p>
             <p className="text-slate-800 font-medium">+ Cover Letter</p>
          </div>

          <div className="space-y-2">
            <div className="text-4xl font-bold text-slate-900">R{PRICE_ZAR}</div>
            <p className="text-slate-500 text-sm">One-time payment. Securely processed.</p>
          </div>

          <ul className="text-left text-sm text-slate-600 space-y-2 bg-indigo-50/50 p-4 rounded-lg">
             <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Editable Microsoft Word (.docx) files
             </li>
             <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                No Watermarks
             </li>
             <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Perfect ATS Formatting
             </li>
             <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Lifetime access via Order ID
             </li>
          </ul>

          <div className="pt-2 space-y-3">
            <button 
              onClick={handlePayment}
              className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Pay R{PRICE_ZAR} to Download
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};