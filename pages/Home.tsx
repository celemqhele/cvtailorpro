
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

      {/* NEW SECTION: Educational Content (For AdSense Approval) */}
      <div className="bg-white py-16 border-t border-slate-100">
         <div className="max-w-4xl mx-auto px-6">
             <div className="prose prose-slate max-w-none text-center mb-12">
                 <h2 className="text-3xl font-bold text-slate-900">Understanding Applicant Tracking Systems (ATS)</h2>
                 <p className="text-slate-600 text-lg">
                    Did you know that 75% of CVs are never seen by a human recruiter? Understanding how the technology works is the first step to getting hired.
                 </p>
             </div>

             <div className="grid md:grid-cols-2 gap-12 text-left">
                 <div>
                     <h3 className="text-xl font-bold text-slate-800 mb-3">What is an ATS?</h3>
                     <p className="text-slate-600 leading-relaxed mb-4">
                        An Applicant Tracking System (ATS) is software used by recruiters and employers to collect, sort, scan, and rank the job applications they receive for their open positions. 
                        It acts as a gatekeeper, filtering out candidates who don't meet specific criteria before a human ever reviews the application.
                     </p>
                     <p className="text-slate-600 leading-relaxed">
                        Common ATS examples include Taleo, Workday, and Greenhouse. These systems parse your resume into digital profiles and assign you a match score based on keyword frequency and relevance.
                     </p>
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800 mb-3">Why Keywords Matter</h3>
                     <p className="text-slate-600 leading-relaxed mb-4">
                        If a job description asks for "Project Management" and your CV says "Managed projects", the ATS might not rank you as highly as a candidate who used the exact phrase. 
                        Contextual matching is improving, but exact matches still drive higher scores.
                     </p>
                     <ul className="list-disc pl-5 space-y-2 text-slate-600">
                         <li><strong>Hard Skills:</strong> e.g., Python, SQL, Financial Analysis.</li>
                         <li><strong>Soft Skills:</strong> e.g., Leadership, Communication.</li>
                         <li><strong>Certifications:</strong> e.g., PMP, CPA.</li>
                     </ul>
                 </div>
             </div>
             
             <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-200">
                 <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">How CV Tailor Pro Helps</h3>
                 <p className="text-slate-600 text-center max-w-2xl mx-auto">
                    Manually rewriting your CV for every job is exhausting. Our AI engine identifies these critical keywords in seconds and naturally weaves them into your existing experience, ensuring you pass the ATS filter while keeping your CV readable and professional for the human recruiter.
                 </p>
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

      {/* FAQ Section */}
      <div className="bg-white py-24 sm:py-32 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-12 text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-12">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Is CV Tailor Pro free?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Yes! We offer a completely free tier that allows you to generate tailored CVs supported by ads.
                    </p>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">How does the AI optimize my CV?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Our AI compares your existing resume against the job description. It identifies missing keywords, restructures your bullet points to emphasize relevant experience, and formats the document for maximum readability.
                    </p>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Is my data safe?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Absolutely. We process your documents securely and do not sell your personal data.
                    </p>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Does it work for any industry?</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Yes. Whether you are in Tech, Finance, Healthcare, or Retail, the principles of keyword matching apply universally.
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
