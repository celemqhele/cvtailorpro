import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { AdBanner } from '../components/AdBanner';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white pt-24 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
             <div className="inline-block bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-1 text-sm font-medium text-indigo-200">
                🚀 AI-Powered Resume Builder
             </div>
             <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
               Beat the Bots. <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Get Hired Faster.</span>
             </h1>
             <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
               Tailor your CV and Cover Letter to any job description in seconds using our advanced AI. Increase your match score and land more interviews.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/app">
                  <Button className="w-full sm:w-auto text-lg py-4 px-8 bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 border-none">
                    Start Tailoring Free
                  </Button>
                </Link>
                <Link to="/about">
                   <Button variant="secondary" className="w-full sm:w-auto text-lg py-4 px-8 bg-transparent text-white border-slate-500 hover:bg-white/10">
                      How it Works
                   </Button>
                </Link>
             </div>
             <p className="text-sm text-slate-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                No credit card required for basic scan
             </p>
          </div>
          
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full"></div>
             <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
                <div className="space-y-4">
                   <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                      <div className="h-2 w-24 bg-slate-600 rounded"></div>
                      <div className="h-6 w-16 bg-green-500/20 text-green-400 rounded flex items-center justify-center text-xs font-bold">94% Match</div>
                   </div>
                   <div className="space-y-2">
                      <div className="h-2 w-full bg-slate-700 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-700 rounded"></div>
                      <div className="h-2 w-5/6 bg-slate-700 rounded"></div>
                   </div>
                   <div className="bg-indigo-900/50 p-4 rounded-lg border border-indigo-500/30">
                      <div className="flex items-start gap-3">
                         <div className="bg-indigo-500 p-1.5 rounded text-white mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         </div>
                         <div>
                            <p className="text-indigo-200 text-xs font-bold mb-1">AI Suggestion</p>
                            <p className="text-slate-300 text-xs">Your experience in "Project Management" aligns perfectly with the "Team Lead" requirement. Emphasized 3 key achievements.</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Ad Section */}
      <section className="bg-white py-8 flex justify-center border-b border-slate-100">
         <AdBanner format="horizontal" />
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-slate-50">
         <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">How it Works</h2>
               <p className="text-slate-600 max-w-2xl mx-auto">Three simple steps to a job-winning application.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl mb-6">1</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Upload CV</h3>
                  <p className="text-slate-600">Upload your existing resume (PDF or Docx). We extract your skills and experience securely.</p>
               </div>
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl mb-6">2</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Add Job Link</h3>
                  <p className="text-slate-600">Paste the URL of the job you want. Our AI analyzes the requirements instantly.</p>
               </div>
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl mb-6">3</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Get Hired</h3>
                  <p className="text-slate-600">Download a perfectly tailored CV and Cover Letter optimized for ATS systems.</p>
               </div>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto bg-indigo-900 rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full bg-indigo-600 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to land your dream job?</h2>
                  <p className="text-indigo-200 mb-8 max-w-lg mx-auto">Join thousands of job seekers who are getting more interviews with tailored applications.</p>
                  <Link to="/app">
                     <Button className="text-lg py-4 px-10 bg-white text-indigo-900 hover:bg-indigo-50 border-none font-bold">
                        Tailor My CV Now
                     </Button>
                  </Link>
              </div>
          </div>
      </section>
    </div>
  );
};

export default Home;