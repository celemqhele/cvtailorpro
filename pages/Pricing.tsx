
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlansSection } from '../components/PlansSection';

export const Pricing: React.FC = () => {
  const { user, triggerPayment } = useOutletContext<any>();

  return (
    <div className="animate-fade-in">
        <div className="bg-white py-12 text-center">
            {/* Limited Time Offer Banner */}
            {(!user || (!user.has_used_discount && !user.is_pro_plus)) && (
                <div className="max-w-4xl mx-auto px-6 mb-8">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-center gap-3 animate-pulse">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Special</span>
                        <p className="text-indigo-900 font-bold text-sm">50% OFF your first upgrade! Discount applied at checkout.</p>
                    </div>
                </div>
            )}
            <h1 className="text-4xl font-extrabold text-slate-900">Upgrade Your Career</h1>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">Choose the perfect plan to accelerate your job search.</p>
        </div>
        <PlansSection 
            onSelectPlan={(planId) => triggerPayment(planId)} 
            userPlanId={user?.plan_id || 'free'} 
        />
    </div>
  );
};
