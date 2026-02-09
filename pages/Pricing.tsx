
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlansSection } from '../components/PlansSection';

export const Pricing: React.FC = () => {
  const { user, triggerPayment } = useOutletContext<any>();

  return (
    <div className="animate-fade-in">
        <div className="bg-white py-12 text-center">
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
