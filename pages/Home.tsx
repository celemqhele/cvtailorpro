
import React from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';

export const Home: React.FC = () => {
  const { user, triggerAuth } = useOutletContext<any>();

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
                    <Link 
                        to="/guestuserdashboard" 
                        className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-transform hover:-translate-y-1"
                    >
                        Get Free CV
                    </Link>
                    <button onClick={triggerAuth} className="text-sm font-semibold leading-6 text-slate-900 hover:text-indigo-600">
                        Sign In <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
            
            {/* Visual Abstract */}
            <div className="mt-16 flow-root sm:mt-24">
                <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                    <div className="rounded-md bg-white p-4 shadow-2xl ring-1 ring-gray-900/10 grid md:grid-cols-3 gap-4">
                        <div className="hidden md:block border border-slate-100 p-4 rounded bg-slate-50">
                            <div className="h-4 w-1/2 bg-slate-200 rounded mb-4"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-slate-200 rounded"></div>
                                <div className="h-2 w-5/6 bg-slate-200 rounded"></div>
                                <div className="h-2 w-4/6 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center text-indigo-500">
                             <svg className="w-12 h-12 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                        <div className="border border-green-100 p-4 rounded bg-green-50">
                            <div className="h-4 w-1/2 bg-green-200 rounded mb-4"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-green-200 rounded"></div>
                                <div className="h-2 w-full bg-green-200 rounded"></div>
                                <div className="h-2 w-full bg-green-200 rounded"></div>
                            </div>
                            <div className="mt-4 text-xs text-green-700 font-bold flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                ATS Optimized
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* External Ad Strip - Non-obtrusive between Hero and Features */}
      <div className="max-w-7xl mx-auto px-4">
          <AdBanner type="external" format="horizontal" />
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
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
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
                </dl>
            </div>
        </div>
      </div>

      {/* Internal Ad: Pro Plan Promo */}
      <div className="bg-white">
        <AdBanner type="internal" />
        <div className="px-6 py-12 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Ready to boost your career?<br />Start applying with confidence today.</h2>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link to="/guestuserdashboard" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        Get Started for Free
                    </Link>
                    <Link to="/blog" className="text-sm font-semibold leading-6 text-slate-900">
                        Read Career Advice <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
