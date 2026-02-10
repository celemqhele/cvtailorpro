
import React, { useState, useEffect } from 'react';
import { jobService } from '../services/jobService';
import { rewriteJobDescription } from '../services/geminiService';
import { JobListing } from '../types';
import { Button } from '../components/Button';
import { GEMINI_KEY_1 } from '../constants';
import { isPreviewOrAdmin } from '../utils/envHelper';
import { useNavigate, useOutletContext } from 'react-router-dom';

export const AdminJobs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<any>();
  
  useEffect(() => {
    // Small timeout to allow user auth to load if it's initial page load
    const checkAccess = setTimeout(() => {
        const isAdmin = isPreviewOrAdmin() || user?.email === 'mqhele03@gmail.com';
        if (!isAdmin) {
            navigate('/');
        }
    }, 1000);
    return () => clearTimeout(checkAccess);
  }, [navigate, user]);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCreatedJob, setLastCreatedJob] = useState<JobListing | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [originalLink, setOriginalLink] = useState('');
  const [rawDesc, setRawDesc] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const getJobLink = (id: string) => {
    // Generate the production-ready link using the specific domain and path structure
    return `https://goapply.co.za/find-jobs/${id}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    try {
        await jobService.deleteJob(id);
        loadJobs();
    } catch (e: any) {
        console.error(e);
        alert(`Failed to delete: ${e.message}`);
    }
  };

  // Only render if we think we might be admin (to prevent flicker, though redirect handles security)
  const isPotentialAdmin = isPreviewOrAdmin() || user?.email === 'mqhele03@gmail.com';
  if (!isPotentialAdmin) return <div className="p-20 text-center">Checking access...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b pb-4">Admin: Manage Jobs</h1>
        
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
            <div className="bg-slate-50 p-6 rounded-xl">
                 <h2 className="text-xl font-bold mb-4">Live Jobs</h2>
                 <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    </div>
  );
};
