
import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { jobService } from '../services/jobService';
import { JobListing } from '../types';
import { AdBanner } from '../components/AdBanner';
import { isPreviewOrAdmin } from '../utils/envHelper';

export const FindJobs: React.FC = () => {
  const { isPaidUser, user } = useOutletContext<any>();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Allow admin features if in preview OR if logged in as specific admin
  const showAdmin = isPreviewOrAdmin() || user?.email === 'mqhele03@gmail.com';

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await jobService.getJobs();
        setJobs(data);
      } catch (e) {
        console.error("Failed to fetch jobs", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent navigation
    if (!confirm("Are you sure you want to delete this job?")) return;
    
    try {
        await jobService.deleteJob(id);
        setJobs(prev => prev.filter(j => j.id !== id));
    } catch(e: any) {
        console.error("Delete error:", e);
        alert(`Failed to delete job. Error: ${e.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900">Find Your Next Role</h1>
            <p className="mt-4 text-xl text-slate-500">Curated opportunities ready for a tailored application.</p>
        </div>

        {!isPaidUser && <AdBanner variant="display" className="mb-12" />}

        {isLoading ? (
            <div className="flex justify-center py-20">
                <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-lg">No open positions available right now. Check back later!</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col relative group">
                        {showAdmin && (
                            <button 
                                onClick={(e) => handleDelete(e, job.id)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-20 p-2 hover:bg-red-50 rounded-full"
                                title="Delete Job (Admin)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                        
                        <div className="mb-4 pr-8">
                            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                <span className="font-semibold">{job.company}</span>
                                <span>•</span>
                                <span>{job.location}</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-1">{job.summary}</p>
                        <Link 
                            to={`/find-jobs/${job.id}`} 
                            className="block w-full py-2.5 text-center bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            View Details
                        </Link>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
