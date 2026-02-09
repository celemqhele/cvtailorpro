
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { jobService } from '../services/jobService';
import { JobListing } from '../types';
import { AdBanner } from '../components/AdBanner';
import { Button } from '../components/Button';

export const JobDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPaidUser, user } = useOutletContext<any>();
  const [job, setJob] = useState<JobListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    if (id) {
        jobService.getJobById(id)
            .then(setJob)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleApplyTailor = () => {
    if (!job) return;
    
    // Determine correct dashboard path based on auth state to avoid redirect glitch
    const targetPath = user ? '/dashboard' : '/guestuserdashboard';

    // Navigate to dashboard with job data to autofill
    navigate(targetPath, { 
        state: { 
            autofillJobDescription: job.description,
            autofillApplyLink: job.original_link 
        } 
    });
  };

  const handleApplyDirect = () => {
    if (!job) return;
    window.open(job.original_link, '_blank');
    setShowApplyModal(false);
  };

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;
  if (!job) return <div className="p-20 text-center">Job not found.</div>;

  return (
    <>
        <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in relative">
            {/* Header */}
            <div className="mb-8 border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">{job.title}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-lg text-slate-600">
                        <span className="font-bold text-indigo-600">{job.company}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{job.location}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-sm text-slate-400">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                
                {/* Added Top Apply Button */}
                <Button onClick={() => setShowApplyModal(true)} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 py-3 px-8">
                    Apply Now
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{job.description}</ReactMarkdown>
                    </div>
                    
                    {!isPaidUser && <AdBanner variant="in-feed" />}
                </div>

                {/* Sidebar CTA */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 sticky top-24">
                        <h3 className="font-bold text-lg mb-4">Interested?</h3>
                        <Button onClick={() => setShowApplyModal(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
                            Apply Now
                        </Button>
                        <p className="text-xs text-center text-slate-400 mt-4">
                            Boost your chances by tailoring your CV to this specific role.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Apply Modal - Moved outside the main container to avoid transform stacking context issues */}
        {showApplyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center relative">
                    <button onClick={() => setShowApplyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Boost Your Application?</h2>
                    <p className="text-slate-600 mb-8">
                        We can rewrite your CV to match this exact job description using AI. It increases your chances of passing the ATS check.
                    </p>

                    <div className="space-y-4">
                        <button 
                            onClick={handleApplyTailor}
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105"
                        >
                            Tailor my CV for Free
                        </button>
                        
                        <button 
                            onClick={handleApplyDirect}
                            className="w-full py-3 bg-white text-slate-500 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        >
                            No thanks, use my current CV
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};
