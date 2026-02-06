import React, { useState } from 'react';
import { PLANS, SubscriptionPlan } from '../services/subscriptionService';

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

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, documentTitle, existingOrderId }) => {
  const [mode, setMode] = useState<'single' | 'subscription'>('single');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('30_days');

  if (!isOpen) return null;

  const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30'; 
  const SINGLE_PRICE = 100;

  const handlePayment = () => {
    let amount = 0;
    let ref = '';
    let metadata = {};

    if (mode === 'single') {
      amount = SINGLE_PRICE;
      // Use existing Order ID if available to allow resuming/upgrading, otherwise create new
      ref = existingOrderId || ('ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    } else {
      const plan = PLANS.find(p => p.id === selectedPlanId);
      if (!plan) return;
      amount = plan.price;
      // Subscription refs are generated after payment usually, but we need a transaction ref
      ref = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();
      metadata = {
        custom_fields: [
          { display_name: "Plan Type", variable_name: "plan_type", value: plan.name },
          { display_name: "Plan ID", variable_name: "plan_id", value: plan.id }
        ]
      };
    }
    
    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: 'customerservice@goapply.co.za', 
      amount: Math.round(amount * 100), // In cents (kobo)
      currency: 'ZAR',
      ref: ref,
      metadata: metadata,
      onClose: () => {
        // User closed modal
      },
      callback: (response: any) => {
        // Pass the Plan ID if subscription, or the Ref if single
        if (mode === 'subscription') {
            onSuccess(selectedPlanId, true); // We pass plan ID, the App.tsx will handle creation with last transaction ref
        } else {
            onSuccess(ref, false);
        }
      }
    });
    
    paystack.openIframe();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="flex bg-slate-100 border-b border-slate-200">
            <button 
                onClick={() => setMode('single')}
                className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider transition-colors ${mode === 'single' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Single Document
            </button>
            <button 
                onClick={() => setMode('subscription')}
                className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider transition-colors ${mode === 'subscription' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700 bg-slate-50'}`}
            >
                Pro Plus (Unlimited)
            </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          
          {mode === 'single' ? (
              // SINGLE PAYMENT MODE
              <div className="text-center space-y-6 max-w-sm mx-auto">
                 <h3 className="text-2xl font-bold text-slate-800">One-Time Unlock</h3>
                 
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Includes</p>
                    <p className="text-slate-900 font-medium">{documentTitle}</p>
                    <p className="text-slate-900 font-medium">+ Cover Letter</p>
                 </div>

                 <div className="text-5xl font-bold text-slate-900">R{SINGLE_PRICE}</div>
                 
                 <ul className="text-left text-sm text-slate-600 space-y-3 bg-indigo-50/50 p-5 rounded-lg">
                    <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Editable Word (.docx)
                    </li>
                    <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Includes Professional Cover Letter
                    </li>
                    <li className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        No Ads & No Watermarks
                    </li>
                 </ul>
              </div>
          ) : (
              // SUBSCRIPTION MODE
              <div className="space-y-6">
                  <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-800">CV Tailor <span className="text-indigo-600">Pro Plus</span></h3>
                      <p className="text-slate-500">Create & Download unlimited CVs for any job.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                      {PLANS.map((plan) => (
                          <div 
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${selectedPlanId === plan.id ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                              {plan.id === '3_months' && (
                                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                      Most Popular
                                  </div>
                              )}
                              <div className="text-center space-y-2">
                                  <h4 className="font-bold text-slate-700">{plan.name}</h4>
                                  <div className="text-xl font-bold text-indigo-700">R{plan.price}</div>
                                  <p className="text-xs text-slate-400">One-time payment</p>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
                      <div className="font-bold text-center border-b border-slate-700 pb-2 mb-2">Pro Plus Benefits</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                             <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             Unlimited Generations
                          </div>
                          <div className="flex items-center gap-2">
                             <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             Unlimited Word Downloads
                          </div>
                          <div className="flex items-center gap-2">
                             <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             Includes Cover Letters
                          </div>
                          <div className="flex items-center gap-2">
                             <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             Priority Processing
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-3">
            <button 
              onClick={handlePayment}
              className={`w-full py-4 px-4 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${mode === 'subscription' ? 'bg-indigo-900 text-white hover:bg-black' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {mode === 'single' ? `Pay R${SINGLE_PRICE} to Unlock` : `Upgrade for R${PLANS.find(p => p.id === selectedPlanId)?.price}`}
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};