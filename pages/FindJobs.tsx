
import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { jobService } from '../services/jobService';
import { JobListing } from '../types';
import { AdBanner } from '../components/AdBanner';
import { isPreviewOrAdmin } from '../utils/envHelper';

export const FindJobs: React.FC = () => {
  const { isPaidUser, user, showToast } = useOutletContext<any>();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  const showAdmin = isPreviewOrAdmin() || user?.email === 'mqhele03@gmail.com';

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await jobService.getJobs();
        setJobs(data);
        setFilteredJobs(data);
      } catch (e) {
        console.error("Failed to fetch jobs", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const filtered = jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = job.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchesSearch && matchesLocation;
    });
    setFilteredJobs(filtered);
  }, [searchQuery, locationFilter, jobs]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
        await jobService.deleteJob(id);
        setJobs(prev => prev.filter(j => j.id !== id));
    } catch(e: any) {
        showToast(`Failed to delete job: ${e.message}`, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900">Find Your Next Role</h1>
            <p className="mt-4 text-xl text-slate-500">Curated opportunities ready for a tailored application.</p>
        </div>

        {/* Filters */}
        <div className="mb-10 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                    type="text" 
                    placeholder="Search by job title, company, or keywords..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="md:w-64 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input 
                    type="text" 
                    placeholder="Location..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                />
            </div>
        </div>

        {!isPaidUser && <AdBanner variant="display" className="mb-12" />}

        {isLoading ? (
            <div className="flex justify-center py-20">
                <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="inline-block p-4 bg-white rounded-full mb-4 shadow-sm">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700">No matching positions found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your filters or check back later.</p>
                <div className="mt-6">
                    <button onClick={() => { setSearchQuery(''); setLocationFilter(''); }} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                        Clear Filters
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map(job => (
                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col relative group">
                        {showAdmin && (
                            <button onClick={(e) => handleDelete(e, job.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-20">
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
                        <Link to={`/find-jobs/${job.id}`} className="block w-full py-2.5 text-center bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors">
                            View Details
                        </Link>
                    </div>
                ))}
            </div>
        )}

        {/* Static Content for SEO/AdSense (Always visible) */}
        <div className="mt-20 border-t border-slate-200 pt-16">
             <div className="max-w-4xl mx-auto">
                 <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Tips for Safe Job Hunting</h2>
                 <div className="grid md:grid-cols-2 gap-8 text-sm text-slate-600">
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <h3 className="font-bold text-slate-800 mb-2">Identify Red Flags</h3>
                          <ul className="list-disc pl-4 space-y-2">
                              <li>Requests for payment for training or equipment before starting.</li>
                              <li>Use of personal emails (gmail/yahoo) instead of company domains.</li>
                              <li>Immediate job offers without an interview process.</li>
                          </ul>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <h3 className="font-bold text-slate-800 mb-2">Protect Your Data</h3>
                          <ul className="list-disc pl-4 space-y-2">
                              <li>Never share your ID number or banking details until you have a formal contract.</li>
                              <li>Research the company on LinkedIn and Google to verify their existence.</li>
                              <li>Trust your instincts; if it sounds too good to be true, it probably is.</li>
                          </ul>
                      </div>
                 </div>
                 
                 <div className="mt-12 text-center">
                     <p className="text-slate-500 italic text-sm">
                         Disclaimer: GoApply aggregates jobs from various sources. While we try to verify listings, please exercise due diligence when applying.
                     </p>
                 </div>
             </div>
        </div>
    </div>
  );
};
