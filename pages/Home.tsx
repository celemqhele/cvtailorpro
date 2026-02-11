
import React from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';
import { PlansSection } from '../components/PlansSection';
import { Testimonials } from '../components/Testimonials';

export const Home: React.FC = () => {
  const { user, triggerAuth, isPaidUser, triggerPayment } = useOutletContext<any>();

  return (
    <div className="animate-fade-in font-sans">
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
            
            {/* Visual Abstract - Before & After Comparison */}
            <div className="mt-16 flow-root sm:mt-24">
                <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                    <div className="rounded-md bg-white p-6 shadow-2xl ring-1 ring-gray-900/10 grid md:grid-cols-7 gap-6 items-center">
                        
                        {/* BEFORE CARD */}
                        <div className="hidden md:block col-span-3 border border-red-100 p-6 rounded-xl bg-slate-50 relative h-full">
                            <div className="absolute -top-3 left-4 bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                Standard CV (Rejected)
                            </div>
                            <div className="space-y-2 mt-2 opacity-70">
                                <h4 className="font-bold text-slate-400 text-xs uppercase mb-2">Professional Summary</h4>
                                <p className="text-xs leading-relaxed text-slate-500 font-serif italic">
                                    "Hard-working and dedicated individual with good communication skills and the ability to work well under pressure. I am a fast learner who always gives 110% in everything I do. I am looking for a challenging position where I can grow within the company and use my skills to the best of my ability. I am passionate about success and always willing to go the extra mile to achieve company goals."
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-[10px] text-red-500 font-bold">Analysis: Too generic. No metrics. Subjective adjectives.</p>
                            </div>
                        </div>

                        {/* ARROW */}
                        <div className="col-span-1 flex flex-col items-center justify-center text-indigo-500 gap-2">
                             <div className="bg-indigo-50 p-3 rounded-full">
                                <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">AI Rewrites</span>
                        </div>

                        {/* AFTER CARD */}
                        <div className="col-span-7 md:col-span-3 border border-green-200 p-6 rounded-xl bg-white shadow-lg relative ring-4 ring-green-50 h-full">
                            <div className="absolute -top-3 left-4 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                CV Tailor Optimized
                            </div>
                            <div className="space-y-2 mt-2">
                                <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Professional Summary</h4>
                                <p className="text-xs leading-relaxed text-slate-700">
                                    "Results-oriented <span className="font-bold bg-indigo-50 text-indigo-700 px-0.5 rounded border border-indigo-100">Project Administrator</span> with <span className="font-bold bg-indigo-50 text-indigo-700 px-0.5 rounded border border-indigo-100">4+ years of experience</span> streamlining operations in high-pressure environments. Proven track record of <span className="font-bold bg-indigo-50 text-indigo-700 px-0.5 rounded border border-indigo-100">improving workflow efficiency by 30%</span> through independent initiative and team collaboration. Dedicated to leveraging strong communication skills to drive organizational KPIs and sustainable growth."
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Result: Hard metrics inserted. Job Title defined. Keywords matched.
                                </p>
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
                <p className="mt-6 text-lg leading-8 text-slate-600">
                    We don't just rewrite your CV. We analyze the gap between your skills and the job requirements.
                </p>
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
                        <dd className="mt-2 text-base leading-7 text-slate-600">The AI scans the job description for critical hard skills and injects them naturally into your experience bullet points.</dd>
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
                        <dd className="mt-2 text-base leading-7 text-slate-600">We automatically generate a matching cover letter that highlights why you are the perfect fit for the specific role.</dd>
                    </div>
                    <div className="relative pl-16">
                        <dt className="text-base font-semibold leading-7 text-slate-900">
                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </div>
                            Context & Style Matching
                        </dt>
                        <dd className="mt-2 text-base leading-7 text-slate-600">Upload additional certifications or reference CVs (e.g. from a colleague) to guide the AI's writing style and content.</dd>
                    </div>
                </dl>
            </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <Testimonials />
      
      {/* Plans Section - Explicitly included to satisfy request */}
      <PlansSection 
        onSelectPlan={(planId) => triggerPayment(planId)}
        userPlanId={user?.plan_id || 'free'}
      />

      {/* FAQ Section */}
      <div className="bg-white py-24 sm:py-32 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-12 text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-12">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Is CV Tailor Pro free?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Yes! We offer a completely free tier that allows you to generate tailored CVs supported by ads. For power users who need unlimited access and no interruptions, we offer affordable upgrade plans.
                    </p>
                    
                    <h3 className="font-bold text-lg text-slate-900 mb-2">How does the AI optimize my CV?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Our AI compares your existing resume against the job description you provide. It identifies missing keywords, restructures your bullet points to emphasize relevant experience, and formats the document for maximum readability by Applicant Tracking Systems (ATS).
                    </p>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Is my data safe?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Absolutely. We process your documents securely and do not sell your personal data to third parties. You can delete your saved applications from your dashboard at any time.
                    </p>

                    <h3 className="font-bold text-lg text-slate-900 mb-2">Does it work for any industry?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Yes. Whether you are in Tech, Finance, Healthcare, or Retail, the principles of keyword matching and clear value proposition apply universally. Our tool adapts to the specific language of your target industry.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Internal Ad / Bottom CTA */}
      <div className="bg-slate-50 border-t border-slate-200">
        {!isPaidUser && <AdBanner variant="internal" />}
        <div className="px-6 py-12 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Ready to boost your career?<br />Start applying with confidence today.</h2>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    {/* Bottom CTA updated to reflect login state */}
                    <Link to={user ? "/dashboard" : "/guestuserdashboard"} className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
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
