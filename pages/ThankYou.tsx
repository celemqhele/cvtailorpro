import React, { useEffect } from 'react';
import { Link, useLocation, Navigate, useOutletContext } from 'react-router-dom';
import { PLANS } from '../services/subscriptionService';

export const ThankYou: React.FC = () => {
  const location = useLocation();
  const { user } = useOutletContext<any>();
  const { planId, isUpgrade } = location.state || {};

  const plan = PLANS.find((p: any) => p.id === planId);
  const planName = plan ? plan.name : 'Pro Plan';

  useEffect(() => {
    // Admin Exclusion Logic
    if (user?.email === 'mqhele03@gmail.com') return;

    // Fire Google Analytics Purchase Event
    if (window.gtag && plan) {
      window.gtag('event', 'purchase', {
        transaction_id: `txn_${Date.now()}`, // Unique ID for deduplication
        value: plan.price,
        currency: 'ZAR',
        items: [
          {
            item_id: plan.id,
            item_name: plan.name,
            price: plan.price,
            quantity: 1
          }
        ]
      });
      console.log('GA4 Purchase Event Fired');
    }
  }, [plan, user]);

  // Prevent direct access to this page without a purchase state
  if (!planId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center relative z-10 border border-slate-100">
        
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
           <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
           </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-8 text-lg">
          {isUpgrade 
            ? `You have successfully upgraded to the ${planName} Plan.`
            : `Welcome to the ${planName} Plan.`
          }
        </p>

        <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200 text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">What happens now?</h3>
            <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Your daily generation limits have been increased.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>All advertisements have been removed.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>You can now upload reference CVs for style matching.</span>
                </li>
            </ul>
        </div>

        <Link 
          to="/dashboard" 
          className="block w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1"
        >
          Go to Dashboard
        </Link>
        
        <p className="mt-4 text-xs text-slate-400">
            A receipt has been sent to your email address.
        </p>
      </div>
    </div>
  );
};
