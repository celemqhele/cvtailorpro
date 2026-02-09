
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { getUsageCount } from '../services/usageService';
import { getPlanDetails, updateUserSubscription } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { AuthModal } from './AuthModal';
import { AccountSettingsModal } from './AccountSettingsModal';
import { PaymentModal } from './DonationModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { SupportModal } from './SupportModal';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Global State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dailyCvCount, setDailyCvCount] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [isMaxPlan, setIsMaxPlan] = useState(false);

  // Modals controlled by Layout
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTriggerPlan, setPaymentTriggerPlan] = useState<string | null>(null);

  useEffect(() => {
    checkUserSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
        const cv = await getUsageCount(user?.id);
        setDailyCvCount(cv);
    };
    fetchCount();
    window.addEventListener('focus', fetchCount);
    return () => window.removeEventListener('focus', fetchCount);
  }, [user]);

  const checkUserSession = async () => {
    const profile = await authService.getCurrentProfile();
    setUser(profile);
    
    let planLimit = 1;
    let isPaid = false;
    let maxPlan = false;

    if (profile) {
        if (profile.email === 'mqhele03@gmail.com') {
            planLimit = 10000;
            isPaid = true;
            maxPlan = true;
        } else {
            const isExpired = profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date();
            if (!isExpired && profile.plan_id) {
                const planDetails = getPlanDetails(profile.plan_id);
                if (planDetails.id !== 'free') {
                    planLimit = planDetails.dailyLimit;
                    isPaid = true;
                    if (planDetails.id === 'tier_4') maxPlan = true;
                }
            }
        }
    }
    setDailyLimit(planLimit);
    setIsPaidUser(isPaid);
    setIsMaxPlan(maxPlan);
  };

  const handlePaymentSuccess = async (planId: string, isSubscription: boolean) => {
    if (user) {
        const success = await updateUserSubscription(user.id, planId);
        if (success) {
            await checkUserSession();
            alert("Plan Activated! Enjoy increased limits and no ads.");
        }
    }
    setPaymentTriggerPlan(null);
    setShowPaymentModal(false);
  };

  const triggerAuth = () => setShowAuthModal(true);
  
  const triggerPayment = (planId?: string) => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }
    if (planId) setPaymentTriggerPlan(planId);
    setShowPaymentModal(true);
  };

  // Context to pass to pages
  const contextData = {
    user,
    dailyCvCount,
    setDailyCvCount,
    dailyLimit,
    isPaidUser,
    isMaxPlan,
    checkUserSession,
    triggerAuth,
    triggerPayment
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
       <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
         <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h1 className="font-bold text-xl tracking-tight text-slate-800">CV Tailor <span className="text-indigo-600">Pro</span></h1>
            </Link>

            <div className="flex items-center gap-3">
                 <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 mr-2 bg-slate-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                    <span className={dailyCvCount >= dailyLimit && !isMaxPlan ? 'text-red-500' : 'text-indigo-600'}>
                         Credits: {isMaxPlan ? '∞' : Math.max(0, dailyLimit - dailyCvCount)}
                    </span>
                 </div>

                 <div className="flex items-center gap-4">
                    <Link to="/pricing" className={`text-sm font-medium transition-colors ${location.pathname === '/pricing' ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600'}`}>
                        Pricing
                    </Link>
                    
                    {user ? (
                        <Link to="/account" className={`text-sm font-medium transition-colors ${location.pathname === '/account' ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600'}`}>
                             {user.full_name || 'Account'}
                        </Link>
                    ) : (
                        <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-slate-600 hover:text-indigo-600">
                             Log In
                        </button>
                    )}
                 </div>
            </div>
         </div>
       </nav>

       <main className="flex-grow">
         <Outlet context={contextData} />
       </main>

       <footer className="bg-white border-t border-slate-200 mt-auto">
           <div className="max-w-4xl mx-auto px-6 py-8 text-center text-slate-400 text-xs">
               <div className="flex justify-center gap-6 mb-4">
                  <Link to="/privacy-policy" className="hover:text-slate-600">Privacy Policy</Link>
                  <Link to="/account" className="hover:text-slate-600">Account</Link>
                  <a href="mailto:customerservice@goapply.co.za" className="hover:text-slate-600">Contact</a>
               </div>
               <p>© {new Date().getFullYear()} CV Tailor Pro. Powered by Gemini 3.</p>
           </div>
       </footer>

       {/* Global Modals */}
       <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => checkUserSession()} />
       <PaymentModal 
            isOpen={showPaymentModal} 
            onClose={() => setShowPaymentModal(false)} 
            onSuccess={handlePaymentSuccess} 
            documentTitle="Pro Plan" 
            existingOrderId={null} 
            triggerPlanId={paymentTriggerPlan} 
       />
    </div>
  );
};
