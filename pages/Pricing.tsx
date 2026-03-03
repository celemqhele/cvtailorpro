import React, { useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { PlansSection } from '../components/PlansSection';
import { RecruiterPlansSection } from '../components/RecruiterPlansSection';

export const Pricing: React.FC = () => {
  const { user, triggerPayment } = useOutletContext<any>();
  const location = useLocation();
  
  // Derive active tab from URL search params directly during render
  const params = new window.URLSearchParams(location.search);
  const tabParam = params.get('tab');
  const activeTab = tabParam === 'recruiter' ? 'recruiter' : 'applicant';

  const navigate = useNavigate();

  return (
    <div className="animate-fade-in min-h-screen bg-slate-50 pb-20">
        <div className="bg-white py-16 text-center border-b border-slate-200">
            {/* Limited Time Offer Banner */}
            {activeTab === 'applicant' && (!user || (!user.has_used_discount && !user.is_pro_plus)) && (
                <div className="max-w-4xl mx-auto px-6 mb-8">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-center gap-3 animate-pulse">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Special</span>
                        <p className="text-indigo-900 font-bold text-sm">50% OFF your first upgrade! Discount applied at checkout.</p>
                    </div>
                </div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">Choose the perfect plan to accelerate your {activeTab === 'applicant' ? 'job search' : 'hiring process'}.</p>

            {/* Tab Switcher */}
            <div className="mt-10 inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                onClick={() => navigate('/pricing?tab=applicant')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'applicant' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                For Applicants
              </button>
              <button
                onClick={() => navigate('/pricing?tab=recruiter')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'recruiter' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                For Recruiters
              </button>
            </div>
        </div>

        {activeTab === 'applicant' ? (
          <PlansSection 
              onSelectPlan={(planId) => triggerPayment(planId)} 
              userPlanId={user?.plan_id || 'free'} 
          />
        ) : (
          <RecruiterPlansSection 
              onSelectPlan={(planId) => triggerPayment(planId)}
              userPlanId={user?.plan_id || 'free'}
          />
        )}
    </div>
  );
};
