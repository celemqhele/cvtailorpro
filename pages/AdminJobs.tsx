
import React, { useState, useEffect } from 'react';
import { jobService } from '../services/jobService';
import { rewriteJobDescription } from '../services/geminiService';
import { resetAllDailyCredits } from '../services/usageService';
import { JobListing } from '../types';
import { Button } from '../components/Button';
import { GEMINI_KEY_1 } from '../constants';
import { isPreviewOrAdmin } from '../utils/envHelper';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export const AdminJobs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<any>();
  const [isChecking, setIsChecking] = useState(true);

  // Robust Admin Check on Mount
  useEffect(() => {
    const verifyAdmin = async () => {
        // 1. Check if we are in a safe preview environment (localhost/stackblitz)
        if (isPreviewOrAdmin()) {
            setIsChecking(false);
            return;
        }

        // 2. Check Context User
        if (user) {
            if (user.email === 'mqhele03@gmail.com') {
                setIsChecking(false);
            } else {
                // Logged in but not admin -> Redirect immediately
                navigate('/');
            }
            return;
        }

        // 3. Context User is null (could be loading or guest). Check Session directly.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === 'mqhele03@gmail.com') {
            setIsChecking(false);
        } else {
            // Not logged in or not admin -> Redirect immediately
            navigate('/');
        }
    };

    verifyAdmin();
  }, [user, navigate]);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCreatedJob, setLastCreatedJob] = useState<JobListing | null>(null);
  
  // Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Notification State
  const [showCopyToast, setShowCopyToast] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [originalLink, setOriginalLink] = useState('');
  const [rawDesc, setRawDesc] = useState('');

  useEffect(() => {
    if (!isChecking) {
        loadJobs();
    }
  }, [isChecking]);

  const loadJobs = async () => {
    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const getJobLink = (id: string) => {
    return `https://goapply.co.za/find-jobs/${id}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2500);
  };

  const checkAdminAndRedirect = () => {
    if (user?.email !== 'mqhele03@gmail.com' && !isPreviewOrAdmin()) {
        navigate('/');
        return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAdminAndRedirect()) return;

    setIsLoading(true);
    setLastCreatedJob(null);

    try {
      // 1. Rewrite description with AI
      const aiResult = await rewriteJobDescription(rawDesc, GEMINI_KEY_1);
      
      // 2. Upload to Supabase
      const newJob = await jobService.createJob({
        title,
        company,
        location,
        original_link: originalLink,
        description: aiResult.description,
        summary: aiResult.summary
      });

      setLastCreatedJob(newJob);

      // 3. Reset
      setTitle('');
      setCompany('');
      setLocation('');
      setOriginalLink('');
      setRawDesc('');
      loadJobs();

    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job?')) return;
    if (!checkAdminAndRedirect()) return;
    
    try {
        await jobService.deleteJob(id);
        loadJobs();
    } catch (e: any) {
        console.error(e);
        alert(`Failed to delete: ${e.message}`);
    }
  };

  const performGlobalReset = async () => {
      if (!checkAdminAndRedirect()) return;

      setIsResetting(true);
      try {
          await resetAllDailyCredits();
          setShowConfirmModal(false);
          setShowSuccessModal(true);
      } catch (e: any) {
          alert(`Failed to reset: ${e.message}`);
          setShowConfirmModal(false);
      } finally {
          setIsResetting(false);
      }
  };

  if (isChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in relative">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b pb-4">Admin: Manage Jobs</h1>
        
        {/* Toast Notification */}
        {showCopyToast && (
            <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce-subtle border border-slate-700">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="font-bold text-sm">Link Copied!</span>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Upload Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">Post New Job</h2>
                
                {lastCreatedJob && (
                    <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg animate-fade-in">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-green-800 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Job Created!
                             </h3>
                             <button onClick={() => setLastCreatedJob(null)} className="text-green-600 hover:text-green-800 text-sm font-bold">Close</button>
                        </div>
                        <p className="text-sm text-green-700 mb-3">Share this link with candidates:</p>
                        <div className="flex gap-2">
                            <input 
                                readOnly 
                                className="flex-1 bg-white border border-green-300 text-sm p-2 rounded text-slate-600 outline-none"
                                value={getJobLink(lastCreatedJob.id)}
                            />
                            <button 
                                onClick={() => copyToClipboard(getJobLink(lastCreatedJob.id))}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Job Title</label>
                        <input className="w-full border p-2 rounded" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Company</label>
                            <input className="w-full border p-2 rounded" value={company} onChange={e => setCompany(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Location</label>
                            <input className="w-full border p-2 rounded" value={location} onChange={e => setLocation(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Apply Link (Redirect URL)</label>
                        <input type="url" className="w-full border p-2 rounded" value={originalLink} onChange={e => setOriginalLink(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Raw Job Description (to be rewritten)</label>
                        <textarea className="w-full border p-2 rounded h-40" value={rawDesc} onChange={e => setRawDesc(e.target.value)} required />
                    </div>
                    <Button type="submit" isLoading={isLoading} className="w-full">
                        Rewrite & Post Job
                    </Button>
                </form>
            </div>

            {/* List */}
            <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4">Live Jobs</h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold">{job.title}</h3>
                                        <p className="text-sm text-slate-500">{job.company}</p>
                                    </div>
                                    <button onClick={() => handleDelete(job.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">
                                        Delete
                                    </button>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">ID: {job.id.substring(0,8)}...</span>
                                    <button 
                                        onClick={() => copyToClipboard(getJobLink(job.id))}
                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold bg-indigo-50 px-2 py-1 rounded"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Controls */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                    <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center gap-2">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Danger Zone
                    </h2>
                    <p className="text-sm text-red-700 mb-4">
                        Use this button to fix global limit issues. It will reset the daily counter for ALL users to 0.
                    </p>
                    <Button 
                        onClick={() => setShowConfirmModal(true)} 
                        isLoading={isResetting}
                        className="w-full bg-red-600 hover:bg-red-700 shadow-red-200 text-white border-none"
                    >
                        Reset All Daily Credits (Today)
                    </Button>
                </div>
            </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative border border-slate-200">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Are you sure?</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        This will reset the daily CV usage count to <strong>0</strong> for <strong>EVERY</strong> user on the platform. This action cannot be undone.
                    </p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={performGlobalReset}
                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                        >
                            Yes, Reset All
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative border border-slate-200">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Credits Reset!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        All daily usage records for today have been wiped. Users now have full credits available.
                    </p>
                    <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
