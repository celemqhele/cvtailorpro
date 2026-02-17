
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { jobService } from '../services/jobService';
import { JobListing, CVData } from '../types';
import { AdBanner } from '../components/AdBanner';
import { Button } from '../components/Button';
import CVTemplate from '../components/CVTemplate';

export const JobDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPaidUser, user } = useOutletContext<any>();
  const [job, setJob] = useState<JobListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [exampleCV, setExampleCV] = useState<CVData | null>(null);

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
        jobService.getJobById(id)
            .then(data => {
                setJob(data);
                
                // Safety check: ensure data exists before accessing properties
                if (data) {
                    if (data.example_cv_content) {
                        try {
                            setExampleCV(JSON.parse(data.example_cv_content));
                        } catch (e) {
                            console.warn("Failed to parse example CV, using fallback");
                            setExampleCV(getFallbackCV(data.title, data.company));
                        }
                    } else {
                        // Use fallback so the preview always shows
                        setExampleCV(getFallbackCV(data.title, data.company));
                    }
                }
            })
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

        {/* Apply Modal */}
        {showApplyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
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
    </>
  );
};
