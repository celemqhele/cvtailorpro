
import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Testimonials } from '../components/Testimonials';

export const WhyUs: React.FC = () => {
  const { user } = useOutletContext<any>();

  const features = [
    {
      title: "AI-Powered Precision",
      desc: "We don't just guess keywords. Our Gemini 3 Pro engine performs deep semantic analysis of the Job Description to align your CV perfectly with what the employer is asking for.",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      )
    },
    {
      title: "ATS Optimized Formats",
      desc: "Beautiful designs are useless if a robot can't read them. Our outputs are rigorously tested against ATS parsers to ensure your skills and experience are actually detected.",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    {
      title: "Cover Letters Included",
      desc: "Why write a cover letter from scratch? We generate a compelling, tailored cover letter for every single application, matching the tone and requirements of the role.",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="bg-indigo-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Why Choose CV Tailor Pro?</h1>
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-8">
            The job market has changed. Generic CVs don't work anymore. 
            We built the tool that gives you the unfair advantage.
          </p>
          <div className="flex justify-center gap-4">
             <Link 
                to={user ? "/dashboard" : "/guestuserdashboard"}
                className="bg-white text-indigo-900 font-bold py-3 px-8 rounded-full hover:bg-indigo-50 transition-transform hover:-translate-y-1 shadow-lg"
             >
                Try It For Free
             </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-12">
            {features.map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                        {f.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{f.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Comparison Section */}
      <div className="bg-slate-50 py-20 px-6 border-y border-slate-200">
         <div className="max-w-5xl mx-auto">
             <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">The CV Tailor Difference</h2>
             <div className="grid md:grid-cols-2 gap-8">
                 {/* Traditional Way */}
                 <div className="bg-white p-8 rounded-xl border border-red-100 shadow-sm opacity-80">
                     <div className="flex items-center gap-3 mb-6">
                         <div className="bg-red-100 p-2 rounded-full text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                         </div>
                         <h3 className="text-xl font-bold text-slate-800">The Old Way</h3>
                     </div>
                     <ul className="space-y-4 text-slate-600">
                         <li className="flex gap-3">
                             <span className="text-red-400">✖</span> Sending the same generic CV to everyone.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-red-400">✖</span> Guessing which keywords matter.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-red-400">✖</span> Formatting breaks in ATS systems.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-red-400">✖</span> Hours spent writing cover letters manually.
                         </li>
                     </ul>
                 </div>

                 {/* Our Way */}
                 <div className="bg-white p-8 rounded-xl border-2 border-indigo-600 shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg uppercase">Recommended</div>
                     <div className="flex items-center gap-3 mb-6">
                         <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         </div>
                         <h3 className="text-xl font-bold text-indigo-900">CV Tailor Pro</h3>
                     </div>
                     <ul className="space-y-4 text-slate-800 font-medium">
                         <li className="flex gap-3">
                             <span className="text-green-500">✔</span> Unique, tailored CV for every single application.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-green-500">✔</span> AI matches your skills to the specific job description.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-green-500">✔</span> Clean, professional, 100% ATS-readable formats.
                         </li>
                         <li className="flex gap-3">
                             <span className="text-green-500">✔</span> Instant cover letter generation included.
                         </li>
                     </ul>
                 </div>
             </div>
         </div>
      </div>

      {/* Testimonials */}
      <Testimonials />

      {/* Bottom CTA */}
      <div className="bg-white py-20 px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to get more interviews?</h2>
          <Link 
            to={user ? "/dashboard" : "/guestuserdashboard"}
            className="inline-block bg-indigo-600 text-white font-bold py-4 px-10 rounded-full hover:bg-indigo-700 hover:shadow-xl transition-all"
          >
            Start Building for Free
          </Link>
      </div>
    </div>
  );
};
