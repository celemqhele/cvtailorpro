
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { getUsageCount } from '../services/usageService';
import { getPlanDetails, updateUserSubscription } from '../services/subscriptionService';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { AuthModal } from './AuthModal';
import { PaymentModal } from './DonationModal';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Global State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dailyCvCount, setDailyCvCount] = useState<number>(0);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [isMaxPlan, setIsMaxPlan] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile menu state

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

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  }, [location.pathname]);

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

  const handleSignOut = async () => {
      await authService.signOut();
      setUser(null);
      navigate('/');
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

  const isActive = (path: string) => location.pathname === path ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-600';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
       {/* Sophisticated Sticky Navigation */}
       <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo Area */}
            <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-md shadow-indigo-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                   <h1 className="font-bold text-xl tracking-tight text-slate-800 leading-none">CV Tailor <span className="text-indigo-600">Pro</span></h1>
                   <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">By GoApply</p>
                </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
                 <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/')}`}>Home</Link>
                 <Link to="/blog" className={`text-sm font-medium transition-colors ${isActive('/blog')}`}>Blog</Link>
                 <Link to="/pricing" className={`text-sm font-medium transition-colors ${isActive('/pricing')}`}>Pricing</Link>
                 
                 {/* Auth Dependent Links */}
                 {user ? (
                     <>
                        <Link to="/dashboard" className={`text-sm font-medium transition-colors ${isActive('/dashboard')}`}>Dashboard</Link>
                        
                        {/* Credits Counter */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                            <span className={dailyCvCount >= dailyLimit && !isMaxPlan ? 'text-red-500' : 'text-indigo-600'}>
                                {isMaxPlan ? '∞' : Math.max(0, dailyLimit - dailyCvCount)} Credits
                            </span>
                        </div>

                        {/* User Menu */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                                {user.full_name || 'Account'}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0 p-2">
                                <Link to="/account" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg hover:text-indigo-600">Settings</Link>
                                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">Sign Out</button>
                            </div>
                        </div>
                     </>
                 ) : (
                     <div className="flex items-center gap-4">
                         <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-slate-600 hover:text-indigo-600">
                             Log In
                         </button>
                         <Link to="/guestuserdashboard" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-indigo-600 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                             Get Free CV
                         </Link>
                     </div>
                 )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600 p-2">
                    {isMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    )}
                 </button>
            </div>
         </div>

         {/* Mobile Menu Dropdown */}
         {isMenuOpen && (
             <div className="md:hidden bg-white border-b border-slate-200 px-4 py-6 space-y-4 shadow-lg animate-fade-in">
                 <Link to="/" className="block text-base font-medium text-slate-600">Home</Link>
                 <Link to="/blog" className="block text-base font-medium text-slate-600">Blog</Link>
                 <Link to="/pricing" className="block text-base font-medium text-slate-600">Pricing</Link>
                 {user ? (
                     <>
                        <Link to="/dashboard" className="block text-base font-medium text-indigo-600">Dashboard</Link>
                        <Link to="/account" className="block text-base font-medium text-slate-600">Account Settings</Link>
                        <button onClick={handleSignOut} className="block w-full text-left text-base font-medium text-red-500">Sign Out</button>
                     </>
                 ) : (
                     <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                         <button onClick={() => setShowAuthModal(true)} className="w-full py-3 border border-slate-300 rounded-xl font-bold text-slate-700">Log In</button>
                         <Link to="/guestuserdashboard" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-center">Get Free CV</Link>
                     </div>
                 )}
             </div>
         )}
       </nav>

       <main className="flex-grow">
         <Outlet context={contextData} />
       </main>

       {/* Footer */}
       <footer className="bg-white border-t border-slate-200 mt-auto pt-16 pb-8">
           <div className="max-w-7xl mx-auto px-6">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                   <div className="col-span-1 md:col-span-1">
                       <h3 className="font-bold text-lg text-slate-900 mb-4">CV Tailor Pro</h3>
                       <p className="text-slate-500 text-sm leading-relaxed">
                           Empowering job seekers with AI-driven tools to land their dream jobs faster.
                       </p>
                   </div>
                   <div>
                       <h4 className="font-bold text-slate-900 mb-4">Product</h4>
                       <ul className="space-y-2 text-sm text-slate-500">
                           <li><Link to="/pricing" className="hover:text-indigo-600">Pricing</Link></li>
                           <li><Link to="/guestuserdashboard" className="hover:text-indigo-600">Free Generator</Link></li>
                           <li><Link to="/dashboard" className="hover:text-indigo-600">Pro Dashboard</Link></li>
                       </ul>
                   </div>
                   <div>
                       <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
                       <ul className="space-y-2 text-sm text-slate-500">
                           <li><Link to="/blog" className="hover:text-indigo-600">Career Blog</Link></li>
                           <li><Link to="/blog/how-to-prep-for-interviews" className="hover:text-indigo-600">Interview Prep</Link></li>
                           <li><Link to="/blog/make-cv-from-scratch" className="hover:text-indigo-600">CV Building Guide</Link></li>
                       </ul>
                   </div>
                   <div>
                       <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
                       <ul className="space-y-2 text-sm text-slate-500">
                           <li><Link to="/privacy-policy" className="hover:text-indigo-600">Privacy Policy</Link></li>
                           <li><Link to="/privacy-policy" className="hover:text-indigo-600">Terms of Service</Link></li>
                           <li><a href="mailto:customerservice@goapply.co.za" className="hover:text-indigo-600">Contact Support</a></li>
                       </ul>
                   </div>
               </div>
               <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                   <p>© {new Date().getFullYear()} CV Tailor Pro by GoApply. All rights reserved.</p>
                   <p className="mt-2 md:mt-0">Powered by Gemini 3. Made with ❤️ in South Africa.</p>
               </div>
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
