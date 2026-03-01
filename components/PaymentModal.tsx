import React, { useState, useEffect } from 'react';
import { PLANS, calculateRemainingValue, getPlanDetails } from '../services/subscriptionService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (planId: string, reference: string) => void;
  documentTitle: string;
  existingOrderId: string | null;
  triggerPlanId?: string | null;
  discountActive?: boolean;
  userEmail?: string;
  userId?: string;
  currentPlanId?: string;
  subscriptionEndDate?: string;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    triggerPlanId, 
    discountActive = false, 
    userEmail,
    userId,
    currentPlanId,
    subscriptionEndDate 
}) => {
  const PUBLIC_KEY = 'pk_live_9989ae457450be7da1256d8a2c2c0b181d0a2d30'; 
  const [selectedPlanId, setSelectedPlanId] = useState<string>('tier_2'); // Default to middle tier

  useEffect(() => {
    if (isOpen && triggerPlanId) {
       setSelectedPlanId(triggerPlanId);
    }
  }, [isOpen, triggerPlanId]);

  if (!isOpen) return null;

  // Calculate remaining value of current plan (if any)
  const tradeInValue = (currentPlanId && subscriptionEndDate && currentPlanId !== 'free') 
    ? calculateRemainingValue(currentPlanId, subscriptionEndDate) 
    : 0;

  const handlePayment = (specificPlanId?: string) => {
    const planId = specificPlanId || selectedPlanId;
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.price === 0) return;
    
    // Base Price
    let finalPrice = plan.price;
    
    // Apply 50% discount if eligible
    if (discountActive) {
        finalPrice = Math.round(plan.price * 0.5); 
    }

    // Apply Prorated Trade-in (Only if upgrading to a more expensive plan usually, but we apply logic if value exists)
    // Ensure we don't go below R5.00 (min transaction fee safety)
    let appliedTradeIn = 0;
    if (tradeInValue > 0) {
        const potentialPrice = finalPrice - tradeInValue;
        if (potentialPrice < 5) {
            // If trade-in covers almost everything, charge min R5
            appliedTradeIn = finalPrice - 5;
            finalPrice = 5;
        } else {
            appliedTradeIn = tradeInValue;
            finalPrice = potentialPrice;
        }
    }

    // Round to 2 decimals for display, but cents for Paystack
    finalPrice = Math.round(finalPrice * 100) / 100;

    // Use random Ref
    // eslint-disable-next-line react-hooks/purity
    const ref = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const metadata = {
        custom_fields: [
          { display_name: "Plan Type", variable_name: "plan_type", value: plan.name },
          { display_name: "Plan ID", variable_name: "plan_id", value: plan.id },
          { display_name: "Discount Applied", variable_name: "discount_applied", value: discountActive ? "Yes" : "No" },
          { display_name: "Trade In Credit", variable_name: "trade_in", value: appliedTradeIn.toFixed(2) }
        ]
    };
    
    const paystack = window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: userEmail || 'customerservice@goapply.co.za', 
      amount: Math.round(finalPrice * 100), // In cents
      currency: 'ZAR',
      ref: ref,
      metadata: metadata,
      onClose: () => {
        // User closed modal
      },
      callback: (response: any) => {
          // This triggers when payment is successful
          // response.reference is the Paystack transaction reference
          onSuccess(planId, response.reference); 
      }
    });
    
    paystack.openIframe();
  };

  const renderCheckoutSummary = () => {
      const plan = PLANS.find(p => p.id === selectedPlanId);
      if (!plan) return null;
      
      let finalPrice = plan.price;
      if (discountActive) finalPrice = Math.round(plan.price * 0.5);
      
      let appliedTradeIn = 0;
      if (tradeInValue > 0) {
          const potentialPrice = finalPrice - tradeInValue;
          if (potentialPrice < 5) {
              appliedTradeIn = finalPrice - 5;
              finalPrice = 5;
          } else {
              appliedTradeIn = tradeInValue;
              finalPrice = potentialPrice;
          }
      }

      return (
          <div className="space-y-6 max-w-md mx-auto">
              <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      No Strings Attached!
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Checkout Summary</h3>
                  <p className="text-slate-500 mt-1 text-sm">Review your selected plan before paying.</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                      <div>
                          <h4 className="font-bold text-lg text-slate-800">{plan.name} Plan</h4>
                          <p className="text-sm text-slate-500">{plan.description}</p>
                      </div>
                      <div className="text-right">
                          {(discountActive || tradeInValue > 0) && <div className="text-xs text-slate-400 line-through">R{plan.price}</div>}
                          <div className="text-2xl font-bold text-indigo-600">R{Math.round(finalPrice)}</div>
                      </div>
                  </div>

                  <ul className="space-y-3 text-sm text-slate-600 mb-6">
                      <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span><strong>One-Time Payment:</strong> No subscriptions, no hidden fees.</span>
                      </li>
                      <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span><strong>Auto-Cancels:</strong> Access automatically expires after 30 days.</span>
                      </li>
                      <li className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span><strong>Instant Access:</strong> Premium features unlocked immediately.</span>
                      </li>
                  </ul>

                  {tradeInValue > 0 && (
                      <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4 border border-green-200">
                          <strong>Credit Applied:</strong> -R{Math.round(appliedTradeIn)} for your remaining days on the current plan.
                      </div>
                  )}
                  
                  {discountActive && (
                      <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-sm mb-4 border border-indigo-200">
                          <strong>Discount Applied:</strong> 50% OFF your first upgrade!
                      </div>
                  )}

                  <button 
                      onClick={() => handlePayment(plan.id)}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Pay Securely (R{Math.round(finalPrice)})
                  </button>
                  
                  <p className="text-[10px] text-slate-400 text-center mt-3 px-4">
                      This is a <strong>one-time payment</strong>. Your access will automatically expire after 30 days. No recurring charges.
                  </p>
                  
                  <div className="mt-4 text-center">
                      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Cancel</button>
                  </div>
              </div>
              
              <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Payments processed securely by Paystack
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 overflow-y-auto">
            {renderCheckoutSummary()}
        </div>
      </div>
    </div>
  );
};
