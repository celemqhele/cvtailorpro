

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';
import { PlansSection } from '../components/PlansSection';
import { Testimonials } from '../components/Testimonials';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, ShieldCheck, X } from 'lucide-react';

export const Home: React.FC = () => {
  const { user, triggerAuth, isPaidUser, triggerPayment } = useOutletContext<any>();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cv_tailor_cookie_consent');
    if (!consent) {
      // Delay showing it slightly for better UX
      const timer = setTimeout(() => setShowConsent(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cv_tailor_cookie_consent', 'true');
    setShowConsent(false);
  };

  return (
    <div className="animate-fade-in font-sans relative">
      {/* Cookie Consent Disclaimer */}
      <AnimatePresence>
        {showConsent && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[100]"
          >
            <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
              <div className="flex items-start gap-4">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 shrink-0">
                  <Cookie size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Cookie & Analytics Notice
                    <ShieldCheck size={14} className="text-emerald-500" />
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    We use cookies and session tokens to understand how you use our site and to distinguish between new and returning visitors. This helps us improve your experience.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button 
                      onClick={handleAccept}
                      className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Accept & Continue
                    </button>
                    <Link to="/privacy" className="text-[10px] text-slate-400 hover:text-indigo-600 underline">
                      Privacy Policy
                    </Link>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConsent(false)}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white pb-16 pt-16 md:pt-24 lg:pb-32 lg:pt-32">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                    Tailor Your CV for <br/>
                    <span className="text-indigo-600">Every Job Application</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                    Stop getting rejected by ATS robots. Our AI analyzes the job description and rewrites your CV to match the keywords perfectly—without inventing facts.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    {/* Primary CTA changes based on auth state */}
                    <Link 
                        to={user ? "/dashboard" : "/guestuserdashboard"} 
                        className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-transform hover:-translate-y-1"
                    >
                        {user ? "Go to Dashboard" : "Get Free CV"}
                    </Link>
                    
                    {/* Sign In only appears if NOT logged in */}
                    {!user && (
                        <button onClick={triggerAuth} className="text-sm font-semibold leading-6 text-slate-900 hover:text-indigo-600">
                            Sign In <span aria-hidden="true">→</span>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Visual Abstract */}
            <div className="mt-16 flow-root sm:mt-24">
                <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                    <div className="rounded-md bg-white p-6 shadow-2xl ring-1 ring-gray-900/10 grid md:grid-cols-7 gap-6 items-center">
                        <div className="hidden md:block col-span-3 border border-red-100 p-6 rounded-xl bg-slate-50 relative h-full">
                            <div className="absolute -top-3 left-4 bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                Standard CV (Rejected)
                            </div>
                            <div className="space-y-2 mt-2 opacity-70">
                                <h4 className="font-bold text-slate-400 text-xs uppercase mb-2">Professional Summary</h4>
                                <p className="text-xs leading-relaxed text-slate-500 font-serif italic">
                                    "Hard-working and dedicated individual with good communication skills and the ability to work well under pressure. I am a fast learner who always gives 110% in everything I do. I am looking for a challenging position where I can grow within the company."
                                </p>
                            </div>
                        </div>

                        <div className="col-span-1 flex flex-col items-center justify-center text-indigo-500 gap-2">
                             <div className="bg-indigo-50 p-3 rounded-full">
                                <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">AI Rewrites</span>
                        </div>

                        <div className="col-span-7 md:col-span-3 border border-green-200 p-6 rounded-xl bg-white shadow-lg relative ring-4 ring-green-50 h-full">
                            <div className="absolute -top-3 left-4 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                CV Tailor Optimized
                            </div>
                            <div className="space-y-2 mt-2">
                                <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Professional Summary</h4>
                                <p className="text-xs leading-relaxed text-slate-700">
                                    "Results-oriented <span className="font-bold bg-indigo-50 text-indigo-700 px-0.5 rounded border border-indigo-100">Project Administrator</span> with <span className="font-bold bg-indigo-50 text-indigo-700 px-0.5 rounded border border-indigo-100">4+ years of experience</span> streamlining operations in high-pressure environments. Proven track record of improving workflow efficiency by 30%."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* NEW SKELETON MODE MARKETING SECTION */}
      <div className="bg-indigo-900 py-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-700 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-10 left-0 w-64 h-64 bg-purple-700 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                      <span className="bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">New Feature</span>
                      <h2 className="text-3xl font-extrabold mb-4">Reverse Engineer the Perfect Job</h2>
                      <p className="text-lg text-indigo-200 mb-6 leading-relaxed">
                          Don't guess what they want. Use <strong>Skeleton Mode</strong> to generate the "Perfect Candidate" CV profile based on the job description.
                      </p>
                      <ul className="space-y-4 mb-8">
                          <li className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <div>
                                  <strong className="text-white block">See the Structure</strong>
                                  <span className="text-indigo-300 text-sm">Get the exact bullet points, keywords, and phrasing the recruiter is looking for.</span>
                              </div>
                          </li>
                          <li className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <div>
                                  <strong className="text-white block">Fill in the Blanks</strong>
                                  <span className="text-indigo-300 text-sm">The CV generates with [Placeholders]. Simply fill them with your truth to match the perfect structure.</span>
                              </div>
                          </li>
                          <li className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              <div>
                                  <strong className="text-white block">Auto-Fill with AI (Pro)</strong>
                                  <span className="text-indigo-300 text-sm">Pro users can upload their existing CV and let AI automatically merge their facts into the Skeleton.</span>
                              </div>
                          </li>
                      </ul>
                      <Link to="/pricing" className="inline-block bg-white text-indigo-900 font-bold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
                          Unlock Skeleton Mode
                      </Link>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative">
                      <div className="absolute -top-4 -right-4 bg-purple-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg transform rotate-6">
                          Blueprint
                      </div>
                      <div className="space-y-4 opacity-80">
                          <div className="h-4 bg-white/20 rounded w-3/4"></div>
                          <div className="h-4 bg-white/20 rounded w-1/2 mb-6"></div>
                          
                          <div className="space-y-2">
                              <div className="flex gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                                  <p className="text-sm text-indigo-100">Led a team of <span className="bg-purple-500/40 px-1 rounded text-white font-mono">[Team Size]</span> developers to migrate legacy code...</p>
                              </div>
                              <div className="flex gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                                  <p className="text-sm text-indigo-100">Managed budget of <span className="bg-purple-500/40 px-1 rounded text-white font-mono">[Amount]</span> achieving ROAS of <span className="bg-purple-500/40 px-1 rounded text-white font-mono">[Metric]</span>...</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MASTER EDITOR MARKETING SECTION */}
      <div className="bg-white py-24 sm:py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 items-center">
                  <div className="lg:pr-8 lg:pt-4">
                      <div className="lg:max-w-lg">
                          <h2 className="text-base font-semibold leading-7 text-indigo-600">Total Control</h2>
                          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Introducing Master Editor</p>
                          <p className="mt-6 text-lg leading-8 text-slate-600">
                              Sometimes AI gets close, but you want to tweak that one specific word or date yourself. <strong>Master Editor</strong> turns your CV preview into a live, editable document.
                          </p>
                          <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-slate-600 lg:max-w-none">
                              <div className="relative pl-9">
                                  <dt className="inline font-bold text-slate-900">
                                      <svg className="absolute left-1 top-1 h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Edit Like Word.
                                  </dt>
                                  <dd className="inline"> Click any text on the CV and type. No forms, no prompts, just direct editing.</dd>
                              </div>
                              <div className="relative pl-9">
                                  <dt className="inline font-bold text-slate-900">
                                      <svg className="absolute left-1 top-1 h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                      Auto-Sync.
                                  </dt>
                                  <dd className="inline"> Your manual changes are saved instantly to your profile and reflected in your PDF/Word downloads.</dd>
                              </div>
                              <div className="relative pl-9">
                                  <dt className="inline font-bold text-slate-900">
                                      <svg className="absolute left-1 top-1 h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                      Perfect Accuracy.
                                  </dt>
                                  <dd className="inline"> Use it to fix specific dates, names, or niche technical terms that require human precision.</dd>
                              </div>
                          </dl>
                      </div>
                  </div>
                  <div className="relative">
                      <div className="relative rounded-xl bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 lg:-m-4 lg:rounded-2xl lg:p-4 shadow-2xl">
                          <div className="bg-white rounded-lg border border-emerald-500 ring-4 ring-emerald-500/10 p-8">
                             <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                <div className="ml-4 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Master Editor Active</div>
                             </div>
                             <div className="space-y-4">
                                <div className="h-8 bg-slate-100 rounded w-1/2"></div>
                                <div className="h-4 bg-slate-50 rounded w-3/4"></div>
                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-sm text-slate-400 italic">"Click here to type your own custom achievement..."</p>
                                    <div className="mt-2 h-4 bg-indigo-50 rounded w-full border-l-2 border-indigo-500"></div>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Feature Section */}
      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
                <h2 className="text-base font-semibold leading-7 text-indigo-600">Match Analysis</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to get hired</p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-4">
                    <div className="relative pl-16">
                        <dt className="text-base font-semibold leading-7 text-slate-900">
                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                            </div>
                            Keyword Matching
                        </dt>
                        <dd className="mt-2 text-base leading-7 text-slate-600">The AI scans the job description for critical hard skills and injects them naturally into your experience.</dd>
                    </div>
                    <div className="relative pl-16">
                        <dt className="text-base font-semibold leading-7 text-slate-900">
                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            </div>
                            Full Rewrite & Formatting
                        </dt>
                        <dd className="mt-2 text-base leading-7 text-slate-600">You get a completely formatted, professional PDF and Word document ready for submission.</dd>
                    </div>
                    <div className="relative pl-16">
                        <dt className="text-base font-semibold leading-7 text-slate-900">
                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            Cover Letters Included
                        </dt>
                        <dd className="mt-2 text-base leading-7 text-slate-600">We automatically generate a matching cover letter that highlights why you are the perfect fit.</dd>
                    </div>
                    <div className="relative pl-16">
                        <dt className="text-base font-semibold leading-7 text-slate-900">
                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </div>
                            Style Matching
                        </dt>
                        <dd className="mt-2 text-base leading-7 text-slate-600">Upload additional certifications or reference CVs to guide the AI's writing style and content.</dd>
                    </div>
                </dl>
            </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <Testimonials />
      
      {/* Plans Section */}
      <PlansSection 
        onSelectPlan={(planId) => triggerPayment(planId)}
        userPlanId={user?.plan_id || 'free'}
      />

      {/* Bottom CTA */}
      <div className="bg-slate-50 border-t border-slate-200">
        {!isPaidUser && <AdBanner variant="internal" />}
        <div className="px-6 py-12 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Ready to boost your career?</h2>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link to={user ? "/dashboard" : "/guestuserdashboard"} className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        {user ? "Go to Dashboard" : "Get Started for Free"}
                    </Link>
                    <Link to="/content" className="text-sm font-semibold leading-6 text-slate-900">
                        Read Career Advice <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};