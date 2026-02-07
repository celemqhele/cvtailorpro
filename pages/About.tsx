import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export const About: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-indigo-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Empowering Job Seekers with AI</h1>
          <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
            We believe that a great candidate shouldn't be rejected just because of a poorly formatted CV. 
            CV Tailor Pro uses advanced AI to level the playing field.
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="max-w-5xl mx-auto py-16 px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
           <p className="text-slate-600 mb-4 leading-relaxed">
             The hiring landscape has changed. Applicant Tracking Systems (ATS) filter out 75% of resumes before a human ever sees them. 
           </p>
           <p className="text-slate-600 mb-4 leading-relaxed">
             At CV Tailor Pro, we built a tool that understands job descriptions as well as a recruiter does. By using Large Language Models (LLMs), we help you tailor your experience to match exactly what employers are looking for—instantly.
           </p>
           <div className="mt-8">
             <Link to="/">
               <Button>Create Your CV</Button>
             </Link>
           </div>
        </div>
        <div className="bg-slate-100 rounded-2xl p-8 border border-slate-200">
           <div className="space-y-6">
              <div className="flex items-start gap-4">
                 <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900">Speed</h3>
                    <p className="text-sm text-slate-500">Tailor a full application package in under 30 seconds.</p>
                 </div>
              </div>
              <div className="flex items-start gap-4">
                 <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900">Accuracy</h3>
                    <p className="text-sm text-slate-500">Powered by Llama 3.3 70B for high-precision text matching.</p>
                 </div>
              </div>
              <div className="flex items-start gap-4">
                 <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900">Privacy</h3>
                    <p className="text-sm text-slate-500">We don't sell your data. Your files are processed securely.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};