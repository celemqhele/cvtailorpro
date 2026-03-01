
import React, { useState, useEffect } from 'react';
import { jobService } from '../services/jobService';
import { contentService } from '../services/contentService';
import { rewriteJobDescription, generateArticle, generateFictionalCV, extractLinkedInDataWithJina, generateJobSpecFromCandidateProfile } from '../services/geminiService';
import { resetAllDailyCredits } from '../services/usageService';
import { JobListing } from '../types';
import { ContentItem } from '../data/blogData';
import { Button } from '../components/Button';
import { isPreviewOrAdmin } from '../utils/envHelper';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export const AdminJobs: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast } = useOutletContext<any>();
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'articles' | 'linkedin'>('jobs');

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
                navigate('/');
            }
            return;
        }

        // 3. Context User is null. Check Session directly.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === 'mqhele03@gmail.com') {
            setIsChecking(false);
        } else {
            navigate('/');
        }
    };

    verifyAdmin();
  }, [user, navigate]);

  // --- Jobs State ---
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [lastCreatedJob, setLastCreatedJob] = useState<JobListing | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobLink, setJobLink] = useState('');
  const [jobRawDesc, setJobRawDesc] = useState('');

  // --- Articles State ---
  const [articles, setArticles] = useState<ContentItem[]>([]);
  const [topic, setTopic] = useState('');
  const [generatedArticle, setGeneratedArticle] = useState<any>(null); // Draft state
  const [lastPublishedSlug, setLastPublishedSlug] = useState<string | null>(null);

  // --- LinkedIn to Job Spec State ---
  const [adminLinkedinUrl, setAdminLinkedinUrl] = useState('');
  const [generatedJobSpec, setGeneratedJobSpec] = useState<string | null>(null);

  // Shared State
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  useEffect(() => {
    if (!isChecking) {
        if (activeTab === 'jobs') loadJobs();
        if (activeTab === 'articles') loadArticles();
    }
  }, [isChecking, activeTab]);

  const loadJobs = async () => {
    try { const data = await jobService.getJobs(); setJobs(data); } catch (e) { console.error(e); }
  };

  const loadArticles = async () => {
    try { 
        const data = await contentService.getAllArticles(); 
        // Filter out static IDs if we want to show only deletable ones, but let's show all
        setArticles(data); 
    } catch (e) { console.error(e); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2500);
  };

  // --- Job Handlers ---
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Rewrite Description
      const aiResult = await rewriteJobDescription(jobTitle, jobRawDesc, "");
      
      // 2. Generate Example CV JSON (New)
      console.log("Generating fictional CV with Cerebras...");
      let exampleCvJson = null;
      try {
          exampleCvJson = await generateFictionalCV(aiResult.description, aiResult.title, "");
      } catch (genErr) {
          console.warn("Failed to generate example CV, continuing without it.", genErr);
      }

      const newJob = await jobService.createJob({
        title: aiResult.title, // Use AI standardized title
        company: jobCompany,
        location: jobLocation,
        original_link: jobLink,
        description: aiResult.description,
        summary: aiResult.summary,
        example_cv_content: exampleCvJson || undefined
      });
      setLastCreatedJob(newJob);
      setJobTitle(''); setJobCompany(''); setJobLocation(''); setJobLink(''); setJobRawDesc('');
      loadJobs();
    } catch (e: any) { showToast(`Error: ${e.message}`, 'error'); } finally { setIsLoading(false); }
  };

  const handleJobDelete = async (id: string) => {
    if (!confirm('Delete job?')) return;
    try { await jobService.deleteJob(id); loadJobs(); } catch (e: any) { showToast(`Error: ${e.message}`, 'error'); }
  };

  // --- Article Handlers ---
  const handleGenerateArticle = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setGeneratedArticle(null);
      try {
          const result = await generateArticle(topic, "");
          setGeneratedArticle(result);
      } catch (e: any) {
          showToast(`Generation failed: ${e.message}`, 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handlePublishArticle = async () => {
      if (!generatedArticle) return;
      setIsLoading(true);
      try {
          await contentService.createArticle(generatedArticle);
          setLastPublishedSlug(generatedArticle.slug);
          setGeneratedArticle(null);
          setTopic('');
          loadArticles();
      } catch (e: any) {
          showToast(`Publish failed: ${e.message}`, 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handleArticleDelete = async (id: string) => {
      if (id.length < 5) { showToast("Cannot delete static/legacy articles.", 'info'); return; } // Simple check for legacy IDs (usually '1', 'v1')
      if (!confirm('Delete article?')) return;
      try { await contentService.deleteArticle(id); loadArticles(); } catch (e: any) { showToast(`Error: ${e.message}`, 'error'); }
  };

  // --- LinkedIn Handlers ---
  const handleGenerateJobSpec = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminLinkedinUrl.includes('linkedin.com')) {
          showToast("Please enter a valid LinkedIn URL", 'error');
          return;
      }
      setIsLoading(true);
      setGeneratedJobSpec(null);
      try {
          // 1. Extract data via Jina
          const profileData = await extractLinkedInDataWithJina(adminLinkedinUrl);
          
          // 2. Generate Job Spec via AI
          const spec = await generateJobSpecFromCandidateProfile(profileData, "");
          setGeneratedJobSpec(spec);
          showToast("Job Spec generated successfully!", 'success');
      } catch (e: any) {
          showToast(`Failed: ${e.message}`, 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const performGlobalReset = async () => {
      try { await resetAllDailyCredits(); setShowConfirmModal(false); setShowSuccessModal(true); } catch (e: any) { showToast(`Failed: ${e.message}`, 'error'); }
  };

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in relative">
        {showCopyToast && (
            <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce-subtle border border-slate-700">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="font-bold text-sm">Copied!</span>
            </div>
        )}

        <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'jobs' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}>Jobs</button>
                <button onClick={() => setActiveTab('articles')} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'articles' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}>Articles (AI)</button>
                <button onClick={() => setActiveTab('linkedin')} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'linkedin' ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}>LinkedIn Scraper</button>
            </div>
        </div>

        {/* ================= JOBS TAB ================= */}
        {activeTab === 'jobs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Post New Job</h2>
                    {lastCreatedJob && (
                        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-green-800">Job Created!</h3>
                                <button onClick={() => setLastCreatedJob(null)} className="text-green-600 font-bold text-sm">Close</button>
                            </div>
                            <div className="flex gap-2">
                                <input readOnly className="flex-1 bg-white border p-2 rounded text-sm" value={`https://goapply.co.za/find-jobs/${lastCreatedJob.id}`} />
                                <button onClick={() => copyToClipboard(`https://goapply.co.za/find-jobs/${lastCreatedJob.id}`)} className="bg-green-600 text-white px-4 rounded font-bold text-sm">Copy</button>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleJobSubmit} className="space-y-4">
                        <input className="w-full border p-2 rounded" placeholder="Job Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
                        <div className="grid grid-cols-2 gap-4">
                            <input className="w-full border p-2 rounded" placeholder="Company" value={jobCompany} onChange={e => setJobCompany(e.target.value)} required />
                            <input className="w-full border p-2 rounded" placeholder="Location" value={jobLocation} onChange={e => setJobLocation(e.target.value)} required />
                        </div>
                        <input className="w-full border p-2 rounded" type="url" placeholder="Apply Link" value={jobLink} onChange={e => setJobLink(e.target.value)} required />
                        <textarea className="w-full border p-2 rounded h-40" placeholder="Raw Job Description" value={jobRawDesc} onChange={e => setJobRawDesc(e.target.value)} required />
                        <Button type="submit" isLoading={isLoading} className="w-full">Rewrite, Create Persona & Post</Button>
                    </form>
                </div>
                <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-xl">
                        <h2 className="text-xl font-bold mb-4">Live Jobs</h2>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {jobs.map(job => (
                                <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold">{job.title}</h3>
                                        <p className="text-sm text-slate-500">{job.company}</p>
                                        {job.example_cv_content && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Has Example CV</span>}
                                    </div>
                                    <button onClick={() => handleJobDelete(job.id)} className="text-red-500 font-bold text-sm">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                        <h2 className="text-xl font-bold mb-2 text-red-800">System</h2>
                        <Button onClick={() => setShowConfirmModal(true)} className="w-full bg-red-600 hover:bg-red-700 border-none">Reset Daily Credits</Button>
                    </div>
                </div>
            </div>
        )}

        {/* ================= ARTICLES TAB ================= */}
        {activeTab === 'articles' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></span>
                        AI Article Generator
                    </h2>
                    
                    {lastPublishedSlug && (
                        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-green-800">Article Published!</h3>
                                <button onClick={() => setLastPublishedSlug(null)} className="text-green-600 font-bold text-sm">Close</button>
                            </div>
                            <div className="flex gap-2">
                                <input readOnly className="flex-1 bg-white border p-2 rounded text-sm" value={`https://goapply.co.za/content/${lastPublishedSlug}`} />
                                <button onClick={() => copyToClipboard(`https://goapply.co.za/content/${lastPublishedSlug}`)} className="bg-green-600 text-white px-4 rounded font-bold text-sm">Copy</button>
                            </div>
                        </div>
                    )}

                    {!generatedArticle ? (
                        <form onSubmit={handleGenerateArticle} className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700">What should the article be about?</label>
                            <textarea 
                                className="w-full border p-4 rounded-xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="e.g. Tips for salary negotiation for junior developers..." 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)} 
                                required 
                            />
                            <Button type="submit" isLoading={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700">Generate Article</Button>
                        </form>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Title</label>
                                <input className="w-full border p-2 rounded" value={generatedArticle.title} onChange={e => setGeneratedArticle({...generatedArticle, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Slug</label>
                                    <input className="w-full border p-2 rounded" value={generatedArticle.slug} onChange={e => setGeneratedArticle({...generatedArticle, slug: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Category</label>
                                    <input className="w-full border p-2 rounded" value={generatedArticle.category} onChange={e => setGeneratedArticle({...generatedArticle, category: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Content (Markdown)</label>
                                <textarea className="w-full border p-2 rounded h-64 text-xs font-mono" value={generatedArticle.content} onChange={e => setGeneratedArticle({...generatedArticle, content: e.target.value})} />
                            </div>
                            <div className="flex gap-4">
                                <Button onClick={() => setGeneratedArticle(null)} variant="secondary" className="flex-1">Discard</Button>
                                <Button onClick={handlePublishArticle} isLoading={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">Publish Article</Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4">Published Articles</h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {articles.map(article => (
                            <div key={article.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-2">
                                <h3 className="font-bold text-sm truncate">{article.title}</h3>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>{article.category} • {article.date}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(`https://goapply.co.za/content/${article.slug}`)} className="text-indigo-600 font-bold hover:underline">Link</button>
                                        <button onClick={() => handleArticleDelete(article.id)} className="text-red-500 font-bold hover:underline">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ================= LINKEDIN TAB ================= */}
        {activeTab === 'linkedin' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">LinkedIn to Job Spec</h2>
                            <p className="text-slate-500 text-sm">Generate a perfect-match job description from a candidate's profile.</p>
                        </div>
                    </div>

                    <form onSubmit={handleGenerateJobSpec} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Candidate LinkedIn URL</label>
                            <div className="flex gap-3">
                                <input 
                                    className="flex-1 border-2 border-slate-100 focus:border-indigo-500 p-4 rounded-xl outline-none transition-all" 
                                    placeholder="https://www.linkedin.com/in/username" 
                                    value={adminLinkedinUrl} 
                                    onChange={e => setAdminLinkedinUrl(e.target.value)} 
                                    required 
                                />
                                <Button type="submit" isLoading={isLoading} className="px-8 bg-indigo-600 hover:bg-indigo-700">
                                    Generate Spec
                                </Button>
                            </div>
                        </div>
                    </form>

                    {generatedJobSpec && (
                        <div className="mt-10 space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Generated Job Specification Template</h3>
                                <button 
                                    onClick={() => copyToClipboard(generatedJobSpec)}
                                    className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Copy Template
                                </button>
                            </div>
                            <textarea 
                                readOnly
                                className="w-full border-2 border-slate-100 p-6 rounded-2xl h-[500px] text-sm font-mono bg-slate-50 focus:ring-0 outline-none"
                                value={generatedJobSpec}
                            />
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>Pro Tip:</strong> Use this generated spec as the "Raw Job Description" in the <strong>Jobs</strong> tab to create a tailored job post and fictional example CV for this client.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {showConfirmModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
                    <h2 className="text-xl font-bold mb-4">Reset All Credits?</h2>
                    <div className="flex gap-4">
                        <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 bg-slate-100 rounded font-bold">Cancel</button>
                        <button onClick={performGlobalReset} className="flex-1 py-2 bg-red-600 text-white rounded font-bold">Yes</button>
                    </div>
                </div>
            </div>
        )}
        
        {showSuccessModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
                    <h2 className="text-xl font-bold mb-4 text-green-600">Success!</h2>
                    <button onClick={() => setShowSuccessModal(false)} className="w-full py-2 bg-green-600 text-white rounded font-bold">Close</button>
                </div>
            </div>
        )}
    </div>
  );
};
