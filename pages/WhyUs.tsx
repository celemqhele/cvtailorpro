
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
    },
    {
      title: "Style & Context Matching",
      desc: "Want your CV to look like a pro example? Or need to attach extra certifications? Our Growth & Pro plans let you upload reference files to guide the AI's writing style.",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
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

      {/* Trust / Social Proof Bar */}
      <div className="bg-white border-b border-slate-200 py-8 relative z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
              <div className="flex items-center gap-4">
                  <div className="bg-white p-2.5 rounded-full shadow-md border border-slate-100 flex items-center justify-center">
                     <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4"/>
                        <path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" fill="#34A853"/>
                        <path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" fill="#FBBC05"/>
                        <path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EA4335"/>
                     </svg>
                  </div>
                  <div>
                      <div className="flex items-center gap-1 text-amber-400">
                           {[1,2,3,4].map(i => (
                               <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                           ))}
                           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <defs>
                                    <linearGradient id="partialStar">
                                        <stop offset="80%" stopColor="currentColor"/>
                                        <stop offset="80%" stopColor="#CBD5E1"/>
                                    </linearGradient>
                                </defs>
                                <path fill="url(#partialStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                           </svg>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">4.8 Star Rating</p>
                  </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2 text-center md:text-left">
                  <p className="text-slate-700 font-medium text-sm md:text-base">
                      Trusted by job seekers across South Africa.
                  </p>
                  <a 
                    href="https://share.google/nn57lEVcIzc7qyjtY" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 text-indigo-600 font-bold hover:underline group"
                  >
                      Read our reviews on Google
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
              </div>
          </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                        {f.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
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
