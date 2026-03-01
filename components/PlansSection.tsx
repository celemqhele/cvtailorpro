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
           {PLANS.map((plan: any) => {
             const isFree = plan.id === 'free';
             const isCurrent = userPlanId ? userPlanId === plan.id : isFree;
             const isPopular = plan.id === 'tier_2'; // Growth
             
             // Feature Checks
             const hasReferenceUpload = plan.hasReferenceUpload;
             const hasSkeletonMode = plan.hasSkeletonMode;
             const hasAutoFill = plan.hasAutoFill;
             const hasMasterEditor = (plan as any).hasMasterEditor;

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
                       <span>{isFree ? '1 CV / Day (Ad-supported)' : <strong>{plan.dailyLimit} CVs per day</strong>}</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                       <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       <span>{isFree ? 'Ad-supported' : 'No Ads'}</span>
                    </li>
                    {!isFree && (
                        <li className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                           <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           <span>AI Smart Editor (Unlimited)</span>
                        </li>
                    )}
                    {hasReferenceUpload && (
                        <li className="flex items-center gap-2 text-sm text-blue-700 font-bold bg-blue-50 p-1 rounded-md -ml-1">
                           <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           <span>Reference CV Upload</span>
                        </li>
                    )}
                    {hasSkeletonMode && (
                        <li className="flex items-center gap-2 text-sm text-purple-700 font-bold bg-purple-50 p-1 rounded-md -ml-1">
                           <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                           <span>Skeleton Mode (Blueprint)</span>
                        </li>
                    )}
                    {hasAutoFill && (
                        <li className="flex items-center gap-2 text-sm text-amber-700 font-bold bg-amber-50 p-1 rounded-md -ml-1">
                           <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                           <span>Auto-Fill Skeleton (AI Merge)</span>
                        </li>
                    )}
                    {hasMasterEditor && (
                        <li className="flex items-center gap-2 text-sm text-emerald-700 font-bold bg-emerald-50 p-1 rounded-md -ml-1">
                           <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           <span>Master Editor (Direct Edit)</span>
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
      </div>
    </section>
  );
};