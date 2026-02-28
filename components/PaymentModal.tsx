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

  const renderPlans = () => (
      <div className="space-y-6">
           <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900">
                  {discountActive ? 'Special Offer Unlocked! 🎉' : tradeInValue > 0 ? 'Upgrade Your Plan' : 'Upgrade for More Power'}
              </h3>
              {discountActive ? (
                  <p className="text-indigo-600 font-bold mt-1 text-sm">
                      50% OFF all plans for your first upgrade.
                  </p>
              ) : tradeInValue > 0 ? (
                  <p className="text-green-600 font-bold mt-1 text-sm">
                      Credit applied for your remaining days.
                  </p>
              ) : (
                  <p className="text-slate-500 mt-1 text-sm">
                      Get unlimited access and premium features.
                  </p>
              )}
              
              {/* Reassurance Badge */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4 mb-2 mx-auto max-w-lg shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-1">
                     <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <p className="text-green-800 text-sm font-bold uppercase tracking-wide">No Strings Attached!</p>
                  </div>
                  <p className="text-green-700 text-xs leading-relaxed">
                      All plans are <strong>strictly one-time payments</strong>. They automatically expire after 30 days. <br/>
                      <strong>No auto-renewals. No hidden fees. Total flexibility.</strong>
                  </p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {PLANS.filter(p => p.price > 0).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isPopular = plan.id === 'tier_2';
                  
                  // Price Calculation for Display
                  let displayPrice = discountActive ? Math.round(plan.price * 0.5) : plan.price;
                  let showTradeIn = false;
                  
                  // Only show trade-in if upgrading to a more expensive plan (or same) logic
                  // If current plan is worth MORE than new plan, we don't refund, just price is R5 min.
                  if (tradeInValue > 0) {
                      displayPrice = displayPrice - tradeInValue;
                      showTradeIn = true;
                      if (displayPrice < 5) displayPrice = 5; // Min transaction
                  }

                  // Don't show price for current plan if it's the one they are on? 
                  // No, they might want to extend.
                  const isCurrent = currentPlanId === plan.id;

                  return (
                    <div 
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative flex flex-col justify-between
                            ${isSelected ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 transform scale-105 z-10' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'}
                            ${isCurrent ? 'opacity-75' : ''}
                        `}
                    >
                        {isPopular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm whitespace-nowrap">
                                Most Popular
                            </div>
                        )}
                        <div className="text-center space-y-1 mb-4 pt-2">
                            <h4 className="font-bold text-slate-700 text-sm uppercase">{plan.name}</h4>
                            <div className="flex flex-col items-center">
                                {(discountActive || showTradeIn) && (
                                    <span className="text-xs text-slate-400 line-through">R{plan.price}</span>
                                )}
                                <div className="text-2xl font-bold text-indigo-700">R{Math.round(displayPrice)}</div>
                                {showTradeIn && (
                                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                                        Includes -R{Math.round(tradeInValue)} credit
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-full py-1 px-2 inline-block mt-1">
                                {plan.description}
                            </div>
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-1 mb-4 text-left pl-2">
                            <li className="flex items-center gap-1 text-green-700 font-medium">✅ One-Time Payment</li>
                            <li className="flex items-center gap-1">✅ No Auto-Renewal</li>
                            <li className="flex items-center gap-1">✅ No Ads</li>
                            <li className="flex items-center gap-1">✅ Priority PDF</li>
                        </ul>
                        <div className={`w-full h-4 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    </div>
                  );
              })}
           </div>

           <button 
              onClick={() => handlePayment()}
              className={`w-full py-4 px-4 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700`}
            >
              Get {PLANS.find(p => p.id === selectedPlanId)?.name} Access
            </button>
            
            <div className="text-center">
                 <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
            </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 overflow-y-auto">
            {renderPlans()}
        </div>
      </div>
    </div>
  );
};
