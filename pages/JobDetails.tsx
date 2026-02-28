
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { jobService } from '../services/jobService';
import { authService } from '../services/authService';
import * as usageService from '../services/usageService';
import * as geminiService from '../services/geminiService';
import { JobListing, CVData, FileData } from '../types';
import { AdBanner } from '../components/AdBanner';
import { Button } from '../components/Button';
import CVTemplate from '../components/CVTemplate';
import { QuickApplyUploadModal } from '../components/QuickApplyUploadModal';
import { ToastNotification, ToastType } from '../components/ToastNotification';
import { LimitReachedModal } from '../components/LimitReachedModal';

export const JobDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPaidUser, user, setDailyCvCount, dailyLimit } = useOutletContext<any>();
  const [job, setJob] = useState<JobListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [exampleCV, setExampleCV] = useState<CVData | null>(null);
  
  // Quick Apply State
  const [showSkeletonPreview, setShowSkeletonPreview] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [skeletonData, setSkeletonData] = useState<CVData | null>(null);
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
  const [limitType, setLimitType] = useState<'quick' | 'daily'>('quick');

  // Helper to generate a placeholder tailored CV if the DB doesn't have one
  const getFallbackCV = (jobTitle: string, company: string): CVData => ({
    name: "Candidate Name",
    title: jobTitle, // Dynamic Title
    location: "Johannesburg, South Africa",
    phone: "+27 82 123 4567",
    email: "candidate@email.com",
    linkedin: "linkedin.com/in/candidate",
    summary: `Highly motivated ${jobTitle} with a proven track record of delivering results in fast-paced environments. Expert in aligning technical solutions with business goals. Eager to leverage experience in project lifecycle management to drive success at ${company}.`,
    skills: [
        { category: "Core Skills", items: "Project Management, Strategic Planning, Data Analysis, Agile Methodologies" },
        { category: "Technical", items: "Microsoft Office 365, JIRA, CRM Software, Cloud Basics" }
    ],
    experience: [
        {
            title: `Senior ${jobTitle}`,
            company: "Global Tech Solutions",
            dates: "2021 - Present",
            achievements: [
                "Led a cross-functional team of 15 members to deliver critical projects 20% under budget.",
                "Optimized operational workflows, reducing process downtime by 15% year-over-year.",
                "Spearheaded the integration of new software tools, improving team collaboration scores by 30%."
            ]
        },
        {
            title: `Junior ${jobTitle}`,
            company: "Innovate Corp",
            dates: "2018 - 2021",
            achievements: [
                "Assisted in the successful rollout of 3 major product features, impacting 10k+ users.",
                "Conducted market research that informed key strategic pivots for Q3 2019."
            ]
        }
    ],
    keyAchievements: [
        "Employee of the Year 2022",
        "Certified Professional (CP) Accreditation"
    ],
    education: [
        {
            degree: "Bachelor of Commerce",
            institution: "University of Cape Town",
            year: "2017"
        }
    ]
  });

  useEffect(() => {
    if (id) {
        setIsLoading(true);
        jobService.getJobById(id)
            .then(data => {
                if (data) {
                    setJob(data);
                    
                    // Handle Example CV
                    if (data.example_cv_content) {
                        try {
                            setExampleCV(JSON.parse(data.example_cv_content));
                        } catch (e) {
                            console.warn("Failed to parse example CV, using fallback");
                            setExampleCV(getFallbackCV(data.title, data.company));
                        }
                    } else {
                        setExampleCV(getFallbackCV(data.title, data.company));
                    }
                } else {
                    setJob(null);
                }
            })
            .catch(err => {
                console.error("Error fetching job:", err);
                setJob(null);
            })
            .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleApplyTailor = async () => {
    if (!job) return;
    
    // 1. Check Quick Apply Limit (Once per day)
    const userPlanId = user?.plan_id;
    const allowedQuickApply = await usageService.checkQuickApplyLimit(userPlanId);
    
    if (!allowedQuickApply) {
        setLimitType('quick');
        setShowApplyModal(false);
        setShowLimitModal(true);
        return;
    }

    // 2. Check Daily CV Credit Limit (e.g. 5 per day)
    const allowedDaily = await usageService.checkUsageLimit(user?.id, dailyLimit);
    if (!allowedDaily) {
        setLimitType('daily');
        setShowApplyModal(false);
        setShowLimitModal(true);
        return;
    }

    // Start Generation Immediately
    setShowApplyModal(false);
    handleSkeletonGenerate();
  };

  const handleSkeletonGenerate = async () => {
    if (!job) return;

    // Compatibility: If older jobs have no description, use summary as fallback
    const jobSpec = job.description || job.summary || "No description provided.";

    setIsGenerating(true);
    try {
        // 1. Generate Skeleton
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "demo-key"; 
        
        const response = await geminiService.generateSkeletonCV(jobSpec, apiKey);
        
        if (response.cvData) {
            setSkeletonData(response.cvData);
            
            // 2. Increment Usage (Both Quick Apply and Daily Credits)
            const userPlanId = user?.plan_id;
            const isAdmin = user?.email === 'mqhele03@gmail.com';

            if (!isAdmin) {
                // Deduct Daily CV Credit
                await usageService.incrementUsage(user?.id);
                if (setDailyCvCount) setDailyCvCount((prev: number) => prev + 1);

                // Deduct Quick Apply (Once per day) Credit if not unlimited
                if (userPlanId !== 'tier_3' && userPlanId !== 'tier_4') {
                    await usageService.incrementQuickApply();
                }
            }
            
            // 3. Show Preview
            setShowSkeletonPreview(true);
        }
    } catch (e) {
        console.error("Skeleton Generation Failed", e);
        setToast({ message: "Failed to generate skeleton CV. Please try again.", type: 'error' });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleUploadCV = async (file: FileData) => {
    if (!skeletonData || !job) return;
    setIsGenerating(true);
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "demo-key";
        
        // 1. Extract text from uploaded file
        const userCvText = await geminiService.extractTextFromFile(file);
        
        // 2. Fill the skeleton
        const finalCV = await geminiService.fillSkeletonCV(skeletonData, userCvText, apiKey);
        
        // 3. Save to DB
        const savedApp = await authService.saveApplication(
            job.title,
            job.company,
            JSON.stringify(finalCV),
            "", // No cover letter for skeleton mode yet
            100, // Match score 100 as it's tailored
            job.original_link
        );

        if (!savedApp) throw new Error("Failed to save application");

        // 4. Navigate to result
        navigate(`/cv-generated/${savedApp.id}`, { 
            state: { 
                cvData: finalCV,
                jobId: job.id,
                jobTitle: job.title,
                companyName: job.company,
                originalLink: job.original_link,
                isGuest: !user
            } 
        });
        
    } catch (e) {
        console.error("Fill CV Failed", e);
        setToast({ message: "Failed to process your CV. Please try again.", type: 'error' });
    } finally {
        setIsGenerating(false);
        setShowUploadModal(false);
    }
  };

  const handleApplyDirect = () => {
    if (!job) return;
    window.open(job.original_link, '_blank');
    setShowApplyModal(false);
  };

  const handleUpgrade = () => {
      navigate('/pricing');
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
        
        {/* Loading Overlay for Generation */}
        {isGenerating && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-bold">Generating Skeleton CV...</h3>
                    <p className="text-slate-300">Analyzing job description and building structure.</p>
                </div>
            </div>
        )}

        {/* Skeleton Preview Modal (New View) */}
        {showSkeletonPreview && skeletonData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex overflow-hidden relative">
                    
                    {/* Close Button */}
                    <button 
                        onClick={() => setShowSkeletonPreview(false)} 
                        className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-slate-100 text-slate-500 p-2 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    {/* Left Panel: Controls & Upload */}
                    <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-8 flex flex-col overflow-y-auto">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Skeleton CV Ready</h2>
                            <p className="text-slate-600 text-sm">
                                We've generated a tailored structure based on the job description. 
                            </p>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
                            <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Free Skeleton Mode
                            </h3>
                            <p className="text-sm text-indigo-700 mb-4">
                                This is your free daily generation. Upload your current CV below to automatically fill in the placeholders with your actual data.
                            </p>
                            <div className="text-xs text-indigo-600 font-medium bg-white/50 p-2 rounded border border-indigo-100 inline-block">
                                Free Version: 1 per day for Find Jobs applications only.
                            </div>
                        </div>

                        <div className="mt-auto">
                            <h3 className="font-bold text-slate-900 mb-4">Complete Your CV</h3>
                            <Button 
                                onClick={() => setShowUploadModal(true)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Upload CV to Fill Placeholders
                            </Button>
                            <p className="text-xs text-center text-slate-400 mt-3">
                                Supports PDF, DOCX, TXT. We'll extract your details.
                            </p>
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="w-2/3 bg-slate-200/50 p-8 overflow-y-auto flex justify-center">
                        <div className="bg-white shadow-2xl min-h-[1123px] w-[794px] transform scale-75 origin-top">
                            <CVTemplate data={skeletonData} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Apply Modal (Existing) */}
        {showApplyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                {/* ... (Existing Apply Modal Content) ... */}
                <div className={`bg-white rounded-3xl shadow-2xl w-full p-8 relative flex flex-col md:flex-row gap-8 overflow-hidden max-h-[90vh] ${exampleCV ? 'max-w-5xl' : 'max-w-lg'}`}>
                    
                    <button onClick={() => setShowApplyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10 bg-white rounded-full p-1 shadow-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    {/* Left Column: CTA */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Boost Your Application?</h2>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Look at the preview on the right. This is the kind of tailored, ATS-optimized CV we can generate for you in seconds based on this exact job description.
                        </p>

                        <div className="space-y-4">
                            <button 
                                onClick={handleApplyTailor}
                                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                Tailor my CV for Free
                            </button>
                            
                            <button 
                                onClick={handleApplyDirect}
                                className="w-full py-3 bg-white text-slate-500 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm"
                            >
                                No thanks, use my current CV
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Example CV Preview */}
                    {exampleCV && (
                        <div className="hidden md:block flex-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group">
                            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-slate-100 via-transparent to-transparent opacity-50"></div>
                            
                            {/* "Sample" Overlay */}
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20 uppercase tracking-widest">
                                Example Result
                            </div>

                            <div className="w-full h-full overflow-hidden flex justify-center items-start pt-8 bg-slate-200/50">
                                {/* Scaled CV Preview Container */}
                                <div className="transform scale-[0.45] origin-top shadow-2xl rounded-sm">
                                    <CVTemplate data={exampleCV} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Quick Apply Upload Modal */}
        <QuickApplyUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUploadCV}
            isLoading={isGenerating}
        />

        {/* Limit Reached Modal */}
        <LimitReachedModal
            isOpen={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            onWatchAd={() => {}} // No ad option for this specific flow
            onUpgrade={handleUpgrade}
            isMaxPlan={false}
            isPaidUser={isPaidUser}
            limit={limitType === 'quick' ? 1 : dailyLimit}
            title={limitType === 'quick' ? "Skeleton Mode Limit Reached" : "Daily Credit Limit Reached"}
            message={limitType === 'quick' 
                ? "You can only use the Quick Tailor (Skeleton Mode) feature once per day on your current plan. Upgrade to Pro for unlimited access."
                : `You have used all your ${isPaidUser ? 'plan' : 'free'} CV generations for today (${dailyLimit}/${dailyLimit}). Upgrade to continue.`
            }
        />

        {/* Toast Notification */}
        {toast && (
            <ToastNotification 
                message={toast.message} 
                type={toast.type} 
                isVisible={!!toast}
                onClose={() => setToast(null)} 
            />
        )}
    </>
  );
};
