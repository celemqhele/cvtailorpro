
import React from 'react';
import { PLANS } from '../services/subscriptionService';

interface PlansSectionProps {
  onSelectPlan: (planId: string) => void;
  userPlanId?: string;
}

export const PlansSection: React.FC<PlansSectionProps> = ({ onSelectPlan, userPlanId }) => {
  return (
    <section className="py-16 bg-white border-t border-slate-200 mt-12" id="plans">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Flexible, One-Time Pricing</h2>
           <p className="text-lg text-slate-600 max-w-2xl mx-auto">
             Pay once, use Pro features for 30 days. <br/>
             <span className="font-bold text-indigo-600">No auto-renewal. No hidden subscriptions. Automatically cancels.</span>
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {PLANS.map(plan => {
             const isFree = plan.id === 'free';
             const isCurrent = userPlanId ? userPlanId === plan.id : isFree;
             const isPopular = plan.id === 'tier_2'; // Growth
             const hasReferenceUpload = ['tier_2', 'tier_3', 'tier_4'].includes(plan.id);

             return (
               <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${isPopular ? 'border-2 border-indigo-500 shadow-xl scale-105 z-10 bg-white' : 'border border-slate-200 shadow-sm hover:shadow-lg bg-slate-50'}`}>
                  {isPopular && <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-md">Most Popular</div>}
                  
                  <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{isFree ? 'Basic Access' : '30-Day Pass'}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">R{plan.price}</span>
                    <span className="text-slate-500 text-sm font-medium"> {isFree ? '' : 'once-off'}</span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-6 min-h-[40px]">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                       <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       <span>{isFree ? '1 CV per ad watch' : <strong>{plan.dailyLimit} CVs per day</strong>}</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                       <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       <span>{isFree ? 'Ad-supported' : 'No Ads'}</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                       <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       <span>{isFree ? 'Standard PDF' : 'Priority Processing'}</span>
                    </li>
                    {hasReferenceUpload && (
                        <li className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                           <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                           <span>Reference Uploads (Style Match)</span>
                        </li>
                    )}
                     {!isFree && (
                        <li className="flex items-center gap-2 text-sm text-indigo-600 font-bold bg-indigo-50 p-1 rounded-md -ml-1 mt-2">
                           <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           Auto-cancels (No risk)
                        </li>
                     )}
                  </ul>

                  <button 
                    onClick={() => onSelectPlan(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
                        isCurrent 
                        ? 'bg-slate-200 text-slate-500 cursor-default shadow-none' 
                        : isPopular 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
                            : 'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : isFree ? 'Current Plan' : 'Get Access'}
                  </button>
               </div>
             );
           })}
        </div>
        
        <div className="mt-16 bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 shadow-inner">
            <h4 className="text-lg font-bold text-slate-800 mb-3">Why are these "One-Time" payments?</h4>
            <p className="text-slate-600 max-w-3xl mx-auto leading-relaxed text-sm md:text-base">
                We believe you should only pay when you need us. Most people only need to update their CV intensely for a few weeks while job hunting. 
                Our plans give you <strong>30 days of power access</strong>, then automatically revert to the free tier. 
                <br className="hidden md:block" />
                <span className="inline-block mt-4 bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wide border border-green-200">
                   Meaning you have all the flexibility in the world.
                </span>
            </p>
        </div>
      </div>
    </section>
  );
};
