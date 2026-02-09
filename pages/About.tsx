
import React from 'react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
        <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">About CV Tailor Pro</h1>
            <p className="text-xl text-slate-500">Bridging the gap between talent and opportunity using advanced AI.</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-12">
            
            {/* Mission Section */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </span>
                    Our Mission
                </h2>
                <p className="text-slate-600 leading-relaxed">
                    At <strong>GoApply</strong>, we believe that qualified candidates shouldn't be rejected simply because they don't know how to beat an Applicant Tracking System (ATS). 
                    CV Tailor Pro was built to democratize access to elite career tools. We empower job seekers by using state-of-the-art Large Language Models (LLMs) to analyze job descriptions 
                    and tailor CVs in real-time, ensuring that your true skills are highlighted in the language recruiters are looking for.
                </p>
            </section>

            {/* Technology Section */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </span>
                    How It Works
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Our platform leverages <strong>Gemini 3 Pro</strong> and <strong>Llama-3</strong> models to perform deep semantic analysis. Unlike simple keyword stuffers, our engine:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600">
                    <li><strong>Analyzes</strong> the target job description to identify hard skills, soft skills, and cultural nuances.</li>
                    <li><strong>Extracts</strong> your professional history, preserving your factual achievements and metrics.</li>
                    <li><strong>Reconstructs</strong> your CV (Curriculum Vitae) to align perfectly with the role, ensuring 100% ATS compliance without fabricating experience.</li>
                </ul>
            </section>

            {/* Privacy Promise */}
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                    Privacy & Ownership
                </h2>
                <p className="text-slate-600 leading-relaxed">
                    We respect your data. Your original CVs are processed in temporary memory for analysis. 
                    While we store your generated history for your convenience, we <strong>never</strong> sell your personal data to third-party recruiters or data brokers.
                    You retain full ownership of the documents you create on our platform.
                </p>
            </section>

             <div className="text-center pt-8">
                <p className="text-slate-500 mb-6">CV Tailor Pro is a product of <strong>GoApply South Africa</strong>.</p>
                <Link to="/contact" className="text-indigo-600 font-bold hover:underline">Get in touch with us</Link>
            </div>
        </div>
    </div>
  );
};
