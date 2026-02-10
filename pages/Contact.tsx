
import React from 'react';

export const Contact: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Contact Us</h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                Have questions about our AI, billing, or just want to say hello? We're here to help you land your dream job.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            
            {/* Email Card - Clickable */}
            <a 
                href="mailto:customerservice@goapply.co.za" 
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col items-center text-center cursor-pointer"
            >
                <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Email Support</h3>
                <p className="text-indigo-600 font-bold mb-3 text-lg">customerservice@goapply.co.za</p>
                <p className="text-sm text-slate-500">
                    Click here to open your email app.<br/>
                    <span className="text-xs mt-1 block">Response time: 24-48 hours</span>
                </p>
            </a>

            {/* Location Card */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <div className="bg-slate-100 p-4 rounded-full text-slate-600 mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Location</h3>
                <p className="text-slate-600 font-medium mb-3 text-lg">Durban, South Africa</p>
                <p className="text-sm text-slate-500">GoApply HQ</p>
            </div>
        </div>
    </div>
  );
};
