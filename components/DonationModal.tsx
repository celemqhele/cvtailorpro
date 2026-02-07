import React, { useState } from 'react';
import { PLANS } from '../services/subscriptionService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, isSubscription: boolean) => void;
  documentTitle: string;
  existingOrderId: string | null;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [view, setView] = useState<'options' | 'one_time' | 'pro_plus'>('options');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('30_days');
  const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30'; 

  if (!isOpen) return null;

  const handlePayment = (specificPlanId?: string) => {
    const planId = specificPlanId || selectedPlanId;
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;
    
    // Subscription refs
    const ref = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const metadata = {
        custom_fields: [
          { display_name: "Plan Type", variable_name: "plan_type", value: plan.name },
          { display_name: "Plan ID", variable_name: "plan_id", value: plan.id }
        ]
    };
    
    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: 'customerservice@goapply.co.za', 
      amount: Math.round(plan.price * 100), // In cents
      currency: 'ZAR',
      ref: ref,
      metadata: metadata,
      onClose: () => {
        // User closed modal
      },
      callback: (response: any) => {
          onSuccess(planId, true); // Treating all as "subscription" flow for service simplicity
      }
    });
    
    paystack.openIframe();
  };

  const renderOptions = () => (
    <div className="space-y-6">
        <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900">Unlock Downloads</h3>
            <p className="text-slate-500 text-sm mt-2">Choose how you want to access your documents.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
            {/* Option 1: One Time */}
            <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-indigo-400 cursor-pointer transition-all bg-white" onClick={() => handlePayment('one_time')}>
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Pro (Single)</span>
                    <span className="text-2xl font-bold text-slate-900">R99</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Download DOCX (Editable)</li>
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Download Cover Letter</li>
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Includes Ads</li>
                </ul>
                <button className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">Unlock Now</button>
            </div>

            {/* Option 2: Pro Plus */}
            <div className="border-2 border-indigo-500 rounded-xl p-6 relative bg-indigo-50 cursor-pointer transform hover:scale-[1.02] transition-all shadow-xl" onClick={() => setView('pro_plus')}>
                 <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">
                      Recommended
                  </div>
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Pro Plus</span>
                    <span className="text-2xl font-bold text-indigo-700">R399+</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> <strong>Unlimited</strong> Downloads</li>
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> <strong>No Ads</strong> (Ad-Free)</li>
                    <li className="flex items-center gap-2"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Priority Processing</li>
                </ul>
                <button className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md">View Plans</button>
            </div>
        </div>
    </div>
  );

  const renderProPlus = () => (
      <div className="space-y-6">
           <div className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-800" onClick={() => setView('options')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-bold">Back</span>
           </div>
           
           <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900"><span className="text-indigo-600">Pro Plus</span> Access</h3>
              <p className="text-slate-500">Remove all ads and download unlimited CVs.</p>
           </div>

           <div className="grid md:grid-cols-3 gap-3">
              {PLANS.filter(p => p.type === 'subscription').map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${selectedPlanId === plan.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                      <div className="text-center space-y-1">
                          <h4 className="font-bold text-slate-700 text-sm">{plan.name}</h4>
                          <div className="text-lg font-bold text-indigo-700">R{plan.price}</div>
                      </div>
                  </div>
              ))}
           </div>

           <button 
              onClick={() => handlePayment()}
              className={`w-full py-4 px-4 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700`}
            >
              Subscribe Now
            </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 overflow-y-auto">
            {view === 'options' ? renderOptions() : renderProPlus()}
            <div className="mt-6 text-center">
                 <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
            </div>
        </div>
      </div>
    </div>
  );
};