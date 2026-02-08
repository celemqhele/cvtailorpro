
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { AdBanner } from './components/AdBanner';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { PaymentModal } from './components/DonationModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { SupportModal } from './components/SupportModal';
import { AuthModal } from './components/AuthModal';
import { HistoryModal } from './components/HistoryModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { ProPlusFeatureCard } from './components/ProPlusFeatureCard';
import { LimitReachedModal } from './components/LimitReachedModal';
import CVTemplate from './components/CVTemplate'; 
import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch, findJobsMatchingCV } from './services/geminiService';
import { updateUserSubscription, PLANS, getPlanDetails } from './services/subscriptionService';
import { authService } from './services/authService';
import { checkUsageLimit, incrementUsage, getUsageCount } from './services/usageService';
import { FileData, GeneratorResponse, Status, MatchAnalysis, UserProfile, SavedApplication, ManualCVData, JobSearchResult, AppMode } from './types';
import { APP_NAME, GEMINI_KEY_1 } from './constants';
import { generateWordDocument, createWordBlob } from './utils/docHelper';
import { createPdfBlob, generatePdfFromApi } from './utils/pdfHelper';
import { supabase } from './services/supabaseClient';

export const App: React.FC = () => {
  // App Mode State
  const [appMode, setAppMode] = useState<AppMode>('tailor'); // 'tailor' or 'finder'

  // User & Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Input Modes
  const [cvInputMode, setCvInputMode] = useState<'upload' | 'scratch'>('upload');
  const [file, setFile] = useState<FileData | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [manualData, setManualData] = useState<ManualCVData>({
    fullName: '', contactInfo: '', summary: '', experience: '', education: '', skills: ''
  });
  
  // Job Target Modes (Tailor Pro)
  const [targetMode, setTargetMode] = useState<'url' | 'text' | 'title'>('text');
  const [jobLink, setJobLink] = useState('');
  const [manualJobText, setManualJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobSpec, setJobSpec] = useState(''); 
  
  // Job Finder State
  const [locationOverride, setLocationOverride] = useState('');
  const [foundJobs, setFoundJobs] = useState<JobSearchResult[]>([]);
  
  const [apiKey] = useState(GEMINI_KEY_1);
  
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Save State Tracking
  const [hasSavedCurrentResult, setHasSavedCurrentResult] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Limit Modal State
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<'cv' | 'search'>('cv');
  const [pendingLimitAction, setPendingLimitAction] = useState<(() => void) | null>(null);
  const [adContext, setAdContext] = useState<'download' | 'limit_reward'>('download');

  // Subscription State
  const [isPaidUser, setIsPaidUser] = useState(false); 
  const [dailyLimit, setDailyLimit] = useState(5);
  const [jobSearchLimit, setJobSearchLimit] = useState(3);
  const [currentPlanName, setCurrentPlanName] = useState('Free');
  const [isMaxPlan, setIsMaxPlan] = useState(false);

  const [paymentTriggerPlan, setPaymentTriggerPlan] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState(false);
  
  // Usage Limit State
  const [dailyCvCount, setDailyCvCount] = useState<number>(0);
  const [dailySearchCount, setDailySearchCount] = useState<number>(0);

  // UI State for Preview
  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  const [isZipping, setIsZipping] = useState(false);

  // 1. Check Auth Status on Load
  useEffect(() => {
    checkUserSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Update Usage Count
  useEffect(() => {
     const fetchCount = async () => {
         const { cv, search } = await getUsageCount(user?.id);
         setDailyCvCount(cv);
         setDailySearchCount(search);
     };
     fetchCount();
  }, [user]);

  // Handle Pending Payment after Login
  useEffect(() => {
      if (user && pendingPayment) {
          setPendingPayment(false);
          setShowPaymentModal(true);
      }
  }, [user, pendingPayment]);

  // 2. Retroactive Save
  useEffect(() => {
    if (user && result && !hasSavedCurrentResult && status === Status.SUCCESS) {
        saveCurrentResultToHistory();
    }
  }, [user, result, hasSavedCurrentResult, status]);

  const checkUserSession = async () => {
    const profile = await authService.getCurrentProfile();
    setUser(profile);
    
    // Default Free
    let planLimit = 5;
    let searchLimit = 0; // Updated Free limit
    let planName = 'Free';
    let isPaid = false;
    let maxPlan = false;

    if (profile) {
        // --- ADMIN / TESTER OVERRIDE ---
        if (profile.email === 'mqhele03@gmail.com') {
            planLimit = 10000;
            searchLimit = 1000;
            planName = 'Admin Unlimited';
            isPaid = true;
            maxPlan = true;
        } else {
            // Normal Logic
            const isExpired = profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date();
            
            if (!isExpired && profile.plan_id) {
                const planDetails = getPlanDetails(profile.plan_id);
                if (planDetails.id !== 'free') {
                    planLimit = planDetails.dailyLimit;
                    searchLimit = planDetails.jobSearchLimit;
                    planName = planDetails.name;
                    isPaid = true;
                    if (planDetails.id === 'tier_4') maxPlan = true;
                }
            }
        }
    }
    
    setDailyLimit(planLimit);
    setJobSearchLimit(searchLimit);
    setCurrentPlanName(planName);
    setIsPaidUser(isPaid);
    setIsMaxPlan(maxPlan);
  };

  const getDaysRemaining = () => {
    if (user?.email === 'mqhele03@gmail.com') return 9999;
    if (!user?.subscription_end_date) return 0;
    const end = new Date(user.subscription_end_date);
    const now = new Date();
    if (end < now) return 0;
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const handleLogout = async () => {
      setShowSettingsModal(false);
      await authService.signOut();
      setUser(null);
      setIsPaidUser(false);
      setIsMaxPlan(false);
      setDailyLimit(5);
      reset();
  };

  const initiatePayment = (action: 'subscribe') => {
      if (!user) {
          setPendingPayment(true);
          setShowAuthModal(true);
          return;
      }
      setShowPaymentModal(true);
  };

  const scrollToPlans = () => {
      const plansSection = document.getElementById('plans');
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const handleSettingsUpgrade = () => {
      setShowSettingsModal(false);
      setTimeout(() => scrollToPlans(), 200);
  };

  const handleLimitAdWatch = () => {
      setShowLimitModal(false);
      setAdContext('limit_reward');
      setShowRewardedModal(true);
  };

  const handleLimitUpgrade = () => {
      setShowLimitModal(false);
      scrollToPlans();
  };

  const handleAdComplete = () => {
      setShowRewardedModal(false);
      if (adContext === 'download') {
          executeZipDownload();
      } else if (adContext === 'limit_reward') {
          if (pendingLimitAction) {
              pendingLimitAction();
              setPendingLimitAction(null);
          }
      }
  };

  // --- FILENAME GENERATION HELPERS ---
  const extractCompanyAndRole = (): { company: string, role: string } => {
      let company = 'Company';
      let role = 'Role';

      if (targetMode === 'title') {
          role = jobTitle.trim() || 'Role';
          company = 'General Application';
      } else {
          // 1. Prefer extraction from AI Analysis (Most accurate)
          if (analysis?.jobTitle) role = analysis.jobTitle;
          if (analysis?.company) company = analysis.company;

          // 2. Fallback to Scraper Regex if AI analysis isn't available or didn't return fields
          if (role === 'Role' || company === 'Company') {
             const roleMatch = jobSpec.match(/JOB TITLE:\s*(.+)/i);
             const companyMatch = jobSpec.match(/COMPANY:\s*(.+)/i);
             if (roleMatch && roleMatch[1]) role = roleMatch[1].trim();
             if (companyMatch && companyMatch[1]) company = companyMatch[1].trim();
          }
      }
      return { company, role };
  };

  const getFilename = (type: 'cv' | 'cl' | 'zip') => {
      const candidateName = result?.cvData?.name || manualData.fullName || 'Candidate';
      const { company, role } = extractCompanyAndRole();
      
      const safeCandidate = candidateName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const safeRole = role.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30);
      const safeCompany = company.replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30);

      const baseName = `${safeCandidate} - ${safeRole} - ${safeCompany}`;
      
      if (type === 'zip') return `${baseName}.zip`;
      if (type === 'cv') return `${baseName} - CV`; 
      return `${baseName} - Cover Letter`;
  };

  const executeZipDownload = async () => {
      if (!result) return;
      
      setIsZipping(true);

      try {
          const zip = new JSZip();
          const baseName = getFilename('cv').replace(' - CV', ''); // Shared base name

          // 1. Generate DOCX files (Client Side)
          if (result.cvData) {
              const cvDocBlob = await createWordBlob('hidden-cv-content');
              if (cvDocBlob) zip.file(`${baseName} - CV.docx`, cvDocBlob);
          }

          if (result.coverLetter) {
              const clDocBlob = await createWordBlob('hidden-cl-content');
              if (clDocBlob) zip.file(`${baseName} - Cover Letter.docx`, clDocBlob);
          }
          
          // 2. Generate PDF files (API Side for high quality)
          document.getElementById('hidden-cv-content')?.classList.remove('no-print');
          const cvPdfBlob = await generatePdfFromApi('hidden-cv-content');
          if (cvPdfBlob) zip.file(`${baseName} - CV.pdf`, cvPdfBlob);
          
          document.getElementById('hidden-cl-content')?.classList.remove('no-print');
          const clPdfBlob = await generatePdfFromApi('hidden-cl-content');
          if (clPdfBlob) zip.file(`${baseName} - Cover Letter.pdf`, clPdfBlob);

          // 3. Package
          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, getFilename('zip'));
          
      } catch (e) {
          console.error("Zip failed", e);
          alert("Failed to create download bundle. Please try again.");
      } finally {
          setIsZipping(false);
          setShowRewardedModal(false);
      }
  };

  const handlePaymentSuccess = async (planId: string, isSubscription: boolean) => {
    if (user) {
        const success = await updateUserSubscription(user.id, planId);
        if (success) {
            await checkUserSession();
            alert("Plan Activated! Enjoy increased limits and no ads.");
        }
    }
    setPaymentTriggerPlan(null);
    setShowPaymentModal(false);
  };

  const validateInputs = () => {
      if (cvInputMode === 'upload' && !file) return false;
      if (cvInputMode === 'scratch' && (!manualData.fullName || !manualData.experience)) return false;
      
      if (appMode === 'tailor') {
          if (targetMode === 'url' && !jobLink) return false;
          if (targetMode === 'text' && !manualJobText.trim()) return false;
          if (targetMode === 'title' && !jobTitle.trim()) return false;
      }
      
      return true;
  };

  // --- JOB FINDER HANDLER ---
  const handleJobSearch = async (bypassLimit: boolean = false) => {
      if (!validateInputs()) return;
      
      const canProceed = bypassLimit || await checkUsageLimit(user?.id, jobSearchLimit, 'search');
      const isAdmin = user?.email === 'mqhele03@gmail.com';
      
      if (!canProceed && !isAdmin) {
          setLimitModalType('search');
          setPendingLimitAction(() => () => handleJobSearch(true));
          setShowLimitModal(true);
          return;
      }

      setStatus(Status.SEARCHING_JOBS);
      setFoundJobs([]);
      setErrorMsg(null);

      try {
          const jobs = await findJobsMatchingCV(
              cvInputMode === 'upload' ? file : null,
              cvInputMode === 'scratch' ? manualData : null,
              locationOverride
          );
          
          setFoundJobs(jobs);
          setStatus(Status.IDLE); // Go back to idle to show list
          
          // Increment Usage only if not admin (admin always bypasses)
          if (!isAdmin) {
             await incrementUsage(user?.id, 'search');
             setDailySearchCount(prev => prev + 1);
          }

          // Save history
          if (user) {
              await authService.saveFoundJobs(jobs);
          }

      } catch (e: any) {
          console.error(e);
          setStatus(Status.ERROR);
          setErrorMsg(e.message || "Failed to find jobs.");
      }
  };

  // --- TAILOR HANDLER ---
  const handleScanAndAnalyze = async (bypassLimit: boolean = false) => {
      if (!validateInputs()) return;

      // New: Check limit BEFORE scanning to prevent "Analysis complete -> Blocked at Generation" flow
      // This improves UX by stopping them earlier.
      // We check 'cv' limit because that's the end goal.
      const canProceed = bypassLimit || await checkUsageLimit(user?.id, dailyLimit, 'cv');
      const isAdmin = user?.email === 'mqhele03@gmail.com';

      if (!canProceed && !isAdmin) {
          setLimitModalType('cv');
          setPendingLimitAction(() => () => handleScanAndAnalyze(true));
          setShowLimitModal(true);
          return;
      }
      
      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');
      setHasSavedCurrentResult(false);

      try {
          let textToAnalyze = '';

          if (targetMode === 'title') {
              setJobSpec(jobTitle);
              // We pass true for bypassLimit because we already checked it above
              handleGenerate(false, true, true); 
              return;
          } else if (targetMode === 'url') {
              textToAnalyze = await scrapeJobFromUrl(jobLink);
          } else {
              textToAnalyze = manualJobText;
          }

          if (!textToAnalyze || textToAnalyze.length < 20) {
              throw new Error("Job description is too short. Please provide more details.");
          }

          setJobSpec(textToAnalyze);
          setStatus(Status.ANALYZING);

          const analysisResult = await analyzeMatch(
              cvInputMode === 'upload' ? file : null, 
              cvInputMode === 'scratch' ? manualData : null,
              textToAnalyze, 
              apiKey
          );
          setAnalysis(analysisResult);
          setStatus(Status.ANALYSIS_COMPLETE);

      } catch (e: any) {
          console.error(e);
          setStatus(Status.ERROR);
          
          const errorMessage = e.message || "";
          const isBlockingError = errorMessage.includes("blocks automated scanning") || errorMessage.includes("Access denied");
          
          if (isBlockingError) {
              setErrorMsg(`${errorMessage} We've switched you to Text mode so you can paste the description directly.`);
              setTargetMode('text');
          } else {
              setErrorMsg(errorMessage || "Failed to scan or analyze job.");
          }
      }
  };

  const saveCurrentResultToHistory = async () => {
      if (!result || !result.cvData) return;
      
      try {
        const { company, role } = extractCompanyAndRole();
        
        await authService.saveApplication(
            role,
            company,
            JSON.stringify(result.cvData), // Save as JSON string
            result.coverLetter?.content || '',
            analysis?.matchScore || 0
        );
        setHasSavedCurrentResult(true);
      } catch (e) {
          console.error("Failed to auto-save to history:", e);
      }
  };

  const handleGenerate = async (forceOverride: boolean = false, isDirectTitleMode: boolean = false, bypassLimit: boolean = false) => {
    // 1. Check Usage Limit
    const canProceed = bypassLimit || await checkUsageLimit(user?.id, dailyLimit, 'cv');
    const isAdmin = user?.email === 'mqhele03@gmail.com';

    if (!canProceed && !isAdmin) {
        setLimitModalType('cv');
        setPendingLimitAction(() => () => handleGenerate(forceOverride, isDirectTitleMode, true));
        setShowLimitModal(true);
        return;
    }

    const force = typeof forceOverride === 'boolean' ? forceOverride : false;
    const currentJobSpec = isDirectTitleMode ? jobTitle : jobSpec;

    if (!apiKey.trim()) return;

    setStatus(Status.GENERATING);
    setErrorMsg(null);
    setResult(null);
    setHasSavedCurrentResult(false);

    try {
      const response = await generateTailoredApplication(
          cvInputMode === 'upload' ? file : null,
          cvInputMode === 'scratch' ? manualData : null,
          currentJobSpec,
          targetMode === 'title' ? 'title' : 'specific',
          apiKey, 
          force,
          linkedinUrl 
      );
      
      if (response.outcome !== 'REJECT') {
          setResult(response);
          setStatus(Status.SUCCESS);
          
          // Increment usage if not admin
          if (!isAdmin) {
             await incrementUsage(user?.id, 'cv');
             setDailyCvCount(prev => prev + 1);
          }

          if (user) {
             await saveCurrentResultToHistory();
          }
      } else {
          setResult(response);
          setStatus(Status.REJECTED);
      }

    } catch (e: any) {
      console.error(e);
      setStatus(Status.ERROR);
      setErrorMsg(e.message || "An unexpected error occurred.");
    }
  };

  const handleLoadHistory = (app: SavedApplication) => {
      try {
        const parsedCV = JSON.parse(app.cv_content);
        setResult({
            outcome: 'PROCEED',
            cvData: parsedCV,
            coverLetter: { title: 'Restored_CL.docx', content: app.cl_content }
        });
        setAnalysis({
            decision: 'APPLY',
            matchScore: app.match_score || 0,
            headline: app.job_title,
            pros: [],
            cons: [],
            reasoning: "Restored from history",
            jobTitle: app.job_title,
            company: app.company_name
        });
        setStatus(Status.SUCCESS);
        setHasSavedCurrentResult(true);
        setAppMode('tailor');
      } catch (e) {
          console.error("Failed to load history item", e);
          alert("Could not load this application. The data format might be outdated.");
      }
  };

  const generateFromFinder = async (job: JobSearchResult, bypassLimit: boolean = false) => {
      // 1. Check Usage Limit for CV Generation first
      const canProceed = bypassLimit || await checkUsageLimit(user?.id, dailyLimit, 'cv');
      const isAdmin = user?.email === 'mqhele03@gmail.com';

      if (!canProceed && !isAdmin) {
          setLimitModalType('cv');
          setPendingLimitAction(() => () => generateFromFinder(job, true));
          setShowLimitModal(true);
          return;
      }

      // 2. If Limit OK, Proceed
      setAppMode('tailor');
      setTargetMode('text');
      setManualJobText(`JOB TITLE: ${job.title}\nCOMPANY: ${job.company}\n\n${job.descriptionSnippet}`);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initiateDownloadBundle = () => {
      if (isPaidUser) {
          executeZipDownload();
          return;
      }
      // Trigger the Support vs Watch Ad Modal for free users
      setShowSupportModal(true);
  };

  const reset = () => {
    setFile(null);
    setJobLink('');
    setJobSpec('');
    setManualJobText('');
    setJobTitle('');
    setLinkedinUrl('');
    setStatus(Status.IDLE);
    setResult(null);
    setAnalysis(null);
    setHasSavedCurrentResult(false);
    setFoundJobs([]);
  };

  const markdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-4xl font-extrabold text-[#2E74B5] text-center border-b-2 border-[#2E74B5] pb-4 mb-8 mt-2 tracking-tight" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-xl font-bold text-[#2E74B5] uppercase border-b border-gray-300 pb-2 mb-4 mt-8 tracking-wide" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-lg font-bold text-slate-900 mb-2 mt-6" {...props} />,
      p: ({node, ...props}: any) => <p className="mb-3 leading-relaxed text-justify text-slate-700" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-700" {...props} />,
      li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-bold text-[#2E74B5]" {...props} />,
  };
  
  const pdfMarkdownComponents = {
    ...markdownComponents,
    h1: ({node, ...props}: any) => <h1 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#2E74B5', borderBottom: '2pt solid #2E74B5', paddingBottom: '10pt', marginBottom: '20pt', textAlign: 'center' }} {...props} />,
    h2: ({node, ...props}: any) => <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#2E74B5', textTransform: 'uppercase', borderBottom: '1pt solid #ccc', paddingBottom: '6pt', marginBottom: '12pt', marginTop: '24pt' }} {...props} />,
    p: ({node, ...props}: any) => <p style={{ fontSize: '10pt', marginBottom: '10pt', lineHeight: '1.4', textAlign: 'left', color: '#000' }} {...props} />,
  };

  const AnalysisDashboard = () => {
      if (!analysis) return null;
      const isPositive = analysis.decision === 'APPLY';
      const colorClass = isPositive ? 'border-green-200 bg-green-50' : analysis.decision === 'CAUTION' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
      const textClass = isPositive ? 'text-green-800' : analysis.decision === 'CAUTION' ? 'text-amber-800' : 'text-red-800';

      return (
          <div className={`p-6 rounded-xl border-2 ${colorClass} space-y-4 animate-fade-in`}>
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className={`text-2xl font-bold ${textClass} mb-1`}>{analysis.headline}</h3>
                      <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isPositive ? 'bg-green-200 text-green-900' : 'bg-slate-200 text-slate-800'}`}>
                              Match: {analysis.matchScore}%
                          </span>
                          <span className="text-sm font-medium text-slate-600">Decision: {analysis.decision}</span>
                      </div>
                  </div>
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                      {isPositive ? (
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                           <span className="font-bold text-lg">{analysis.matchScore}</span>
                      )}
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 p-3 rounded-lg">
                      <strong className="text-green-700 block mb-1">Pros</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {analysis.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                      </ul>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                      <strong className="text-red-700 block mb-1">Cons</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {analysis.cons.map((con, i) => <li key={i}>{con}</li>)}
                      </ul>
                  </div>
              </div>
              
              <div className="bg-white/80 p-4 rounded-lg border border-white">
                  <p className="text-slate-700 italic">"{analysis.reasoning}"</p>
              </div>

              <div className="pt-2 flex gap-4">
                  {/* IMPORTANT: We call handleGenerate(false) here, which triggers the checkUsageLimit in handleGenerate */}
                  <Button onClick={() => handleGenerate(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">Generate Tailored CV</Button>
                  {!isPositive && <Button onClick={reset} variant="secondary" className="w-1/3">Cancel</Button>}
              </div>
          </div>
      );
  };

  const PlansSection = () => (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mt-12 mb-12 animate-fade-in no-print" id="plans">
          <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900">Choose Your Plan</h2>
              <p className="text-slate-500 mt-2">Unlock the full potential of CV Tailor & Job Finder Pro</p>
          </div>
          {/* Changed grid to support 5 items (including free) responsively */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {PLANS.map((plan) => {
                  const isFree = plan.price === 0;
                  return (
                    <div key={plan.id} className="border border-slate-200 rounded-xl p-6 flex flex-col relative hover:shadow-lg transition-shadow bg-white">
                        {plan.id === 'tier_2' && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>}
                        <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                        <div className="text-2xl font-bold text-indigo-600 my-4">
                            {isFree ? 'Free' : `R${plan.price}`}
                            {!isFree && <span className="text-xs text-slate-400 font-normal ml-1">/30 days</span>}
                        </div>
                        <p className="text-xs text-slate-500 mb-6 flex-1">{plan.description}</p>
                        <ul className="space-y-3 text-xs text-slate-600 mb-6">
                            <li className="flex items-center gap-2">
                                <span className={plan.dailyLimit > 5 ? "text-green-600 font-bold" : ""}>{plan.dailyLimit} CV Gens / Day</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className={plan.jobSearchLimit > 1 ? "text-green-600 font-bold" : ""}>{plan.jobSearchLimit} Job Searches / Day</span>
                            </li>
                            <li className="flex items-center gap-2">
                                {isFree ? 'Ads Enabled' : <span className="text-green-600 font-bold">Ad-Free Experience</span>}
                            </li>
                        </ul>
                        {isFree ? (
                             <Button disabled variant="secondary" className="w-full text-xs opacity-50 cursor-not-allowed">
                                 Default Plan
                             </Button>
                        ) : (
                             <Button onClick={() => initiatePayment('subscribe')} variant="secondary" className="w-full text-xs">
                                 Upgrade
                             </Button>
                        )}
                    </div>
                  );
              })}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      
      {!user && (
          <div className="bg-indigo-900 text-indigo-100 text-[10px] sm:text-xs py-1.5 px-4 text-center border-b border-indigo-800 relative z-20 no-print">
              By using this service, you agree to our <span className="underline cursor-pointer hover:text-white" onClick={() => setShowPrivacyModal(true)}>Terms and Conditions & Privacy Policy</span>.
          </div>
      )}

      <div className="p-6 md:p-12">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={checkUserSession} />
      <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} onLoadApplication={handleLoadHistory} />
      <AccountSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} user={user} onProfileUpdate={checkUserSession} onUpgradeClick={handleSettingsUpgrade} />
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)}
        onConfirmSupport={() => { setShowSupportModal(false); initiatePayment('subscribe'); }}
        onContinueFree={() => { setShowSupportModal(false); setAdContext('download'); setShowRewardedModal(true); }}
      />

      <LimitReachedModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        type={limitModalType}
        onWatchAd={handleLimitAdWatch}
        onUpgrade={handleLimitUpgrade}
        isMaxPlan={isMaxPlan}
      />

      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => { setShowPaymentModal(false); setPaymentTriggerPlan(null); }}
        onSuccess={handlePaymentSuccess}
        documentTitle={result?.cvData?.name ? `CV_${result.cvData.name.replace(/\s+/g, '_')}` : "Tailored_Application"}
        existingOrderId={null}
        triggerPlanId={paymentTriggerPlan}
      />

      <RewardedAdModal 
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        onComplete={handleAdComplete}
      />

      {/* Hidden Render Container for PDF */}
      {result && (
        <div className="fixed left-[-9999px] top-0 no-print">
            <div id="hidden-cv-content">
                {result.cvData && <CVTemplate data={result.cvData} />}
            </div>
            <div 
                id="hidden-cl-content" 
                style={{ width: '816px', padding: '72px', backgroundColor: 'white', fontFamily: 'Calibri, Arial, sans-serif', color: '#1a1a1a', fontSize: '11px', lineHeight: '1.4', boxSizing: 'border-box' }}
            >
                <ReactMarkdown components={pdfMarkdownComponents}>{result.coverLetter?.content || ''}</ReactMarkdown>
            </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-8 relative no-print">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-md cursor-pointer" onClick={reset}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
            </div>
            <p className="text-slate-600 text-sm">Tailor your CV or Find the perfect Job.</p>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-2">
             {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-900">{user.full_name || user.email}</span>
                      {isPaidUser ? (
                        <span className="text-xs text-green-600 font-bold uppercase">
                            {currentPlanName} Plan ({getDaysRemaining()}d left)
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-slate-500">Free Account</span>
                             <div className="flex gap-2 text-[10px] text-slate-400">
                                <span>CVs: <span className={`${dailyCvCount >= dailyLimit ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{dailyCvCount}</span>/{dailyLimit}</span>
                                <span>|</span>
                                <span>Search: <span className={`${dailySearchCount >= jobSearchLimit ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{dailySearchCount}</span>/{jobSearchLimit}</span>
                             </div>
                             <button onClick={scrollToPlans} className="text-[10px] text-indigo-600 hover:underline">Upgrade Limit</button>
                        </div>
                      )}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setShowHistoryModal(true)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">History</button>
                      <button onClick={() => setShowSettingsModal(true)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Settings</button>
                      <button onClick={handleLogout} className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-red-600 rounded-lg text-sm font-medium">Sign Out</button>
                  </div>
                </div>
             ) : (
                <div className="flex flex-col items-end gap-2">
                   <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Login / Sign Up</button>
                   <div className="flex gap-2 text-[10px] text-slate-400">
                        <span>CVs: <span className={`${dailyCvCount >= dailyLimit ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{dailyCvCount}</span>/{dailyLimit}</span>
                        <span>|</span>
                        <span>Search: <span className={`${dailySearchCount >= jobSearchLimit ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{dailySearchCount}</span>/{jobSearchLimit}</span>
                   </div>
                </div>
             )}
          </div>
        </header>

        {/* Mode Switcher */}
        <div className="flex justify-center mb-8 no-print">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                <button 
                    onClick={() => { setAppMode('tailor'); setStatus(Status.IDLE); setFoundJobs([]); }}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${appMode === 'tailor' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    CV Tailor Pro
                </button>
                <button 
                    onClick={() => { setAppMode('finder'); setStatus(Status.IDLE); setResult(null); }}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${appMode === 'finder' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Job Finder Pro
                </button>
            </div>
        </div>

        <main className="grid grid-cols-1 gap-8">
          
          {(status === Status.IDLE || status === Status.ERROR) && foundJobs.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-fade-in no-print">
              {!isPaidUser && <AdBanner suffix="top" format="horizontal" />}
              
              {/* COMMON INPUT: CV Upload */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">1. Candidate Information</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setCvInputMode('upload')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Upload CV</button>
                        <button onClick={() => setCvInputMode('scratch')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'scratch' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Create from Scratch</button>
                    </div>
                </div>
                 <div className="relative">
                    <input type="url" placeholder="Paste your LinkedIn Profile URL (Optional)" className="w-full pl-4 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                </div>
                {cvInputMode === 'upload' ? (
                     <FileUpload onFileSelect={setFile} selectedFileName={file?.name} />
                ) : (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <input type="text" placeholder="Full Name" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={manualData.fullName} onChange={e => setManualData({...manualData, fullName: e.target.value})} />
                         <input type="text" placeholder="Contact Info (Phone, Email, Location)" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={manualData.contactInfo} onChange={e => setManualData({...manualData, contactInfo: e.target.value})} />
                        <textarea placeholder="Professional Experience..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24" value={manualData.experience} onChange={e => setManualData({...manualData, experience: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                            <textarea placeholder="Education..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20" value={manualData.education} onChange={e => setManualData({...manualData, education: e.target.value})} />
                             <textarea placeholder="Skills..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20" value={manualData.skills} onChange={e => setManualData({...manualData, skills: e.target.value})} />
                        </div>
                    </div>
                )}
              </div>

              {appMode === 'tailor' ? (
                /* --- CV TAILOR MODE --- */
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-2 gap-2">
                        <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">2. Target Job</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setTargetMode('text')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Text</button>
                            <button onClick={() => setTargetMode('url')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Link</button>
                            <button onClick={() => setTargetMode('title')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'title' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Title Only</button>
                        </div>
                    </div>
                    {targetMode === 'url' && (
                            <>
                                <div className="flex gap-2">
                                    <input type="url" value={jobLink} onChange={(e) => setJobLink(e.target.value)} placeholder="https://linkedin.com/jobs/..." className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                                </div>
                                <p className="text-xs text-slate-400">Supported: LinkedIn, Indeed, Glassdoor, Company Pages.</p>
                            </>
                    )}
                    {targetMode === 'text' && (
                        <textarea value={manualJobText} onChange={(e) => setManualJobText(e.target.value)} placeholder="Paste job description..." className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 h-32 text-sm resize-none" />
                    )}
                    {targetMode === 'title' && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs text-indigo-700 mb-2 font-semibold">General Optimization Mode</p>
                            <input type="text" placeholder="Enter Job Title (e.g. Project Manager)" className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-bold" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                        </div>
                    )}
                    
                    <div className="pt-4">
                        {/* We use handleScanAndAnalyze to pre-check limits before moving to dashboard */}
                        <Button onClick={() => handleScanAndAnalyze()} disabled={!validateInputs()} className="w-full text-lg py-4 bg-slate-800 hover:bg-slate-900">
                        {targetMode === 'title' ? 'Generate General CV (Skip Analysis)' : (targetMode === 'url' ? 'Scan Link & Analyze Match' : 'Analyze Job Match')}
                        </Button>
                    </div>
                </div>
              ) : (
                /* --- JOB FINDER MODE --- */
                <div className="space-y-4">
                     <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">2. Search Preferences</label>
                     </div>
                     <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                         <p className="text-sm text-indigo-800 mb-4 font-medium">We'll analyze your CV to automatically find the best roles. Optionally, override the location below.</p>
                         <input 
                            type="text" 
                            placeholder="Location (e.g. London, Remote, New York) - Leave empty to auto-detect from CV" 
                            className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                            value={locationOverride}
                            onChange={(e) => setLocationOverride(e.target.value)}
                        />
                     </div>
                     <div className="pt-4">
                        <Button onClick={() => handleJobSearch()} disabled={!validateInputs()} className="w-full text-lg py-4 bg-indigo-600 hover:bg-indigo-700">
                            Find Matching Jobs
                        </Button>
                     </div>
                </div>
              )}

              {!isPaidUser && <AdBanner suffix="middle" format="horizontal" />}

              {errorMsg && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200"><strong>Error:</strong> {errorMsg}</div>}
              
              <p className="text-xs text-center text-slate-400 mt-4">Free Tool • Powered by Cerebras AI</p>

              {!isPaidUser && (
                 <div className="pt-4 border-t border-slate-100">
                    <ProPlusFeatureCard onUpgrade={scrollToPlans} minimal={true} />
                 </div>
              )}
            </div>
          )}

          {/* LOADING STATE */}
          {(status === Status.SCANNING || status === Status.ANALYZING || status === Status.GENERATING || status === Status.SEARCHING_JOBS) && (
             <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in no-print">
                 <div className="relative w-20 h-20">
                     <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">
                         {status === Status.SCANNING && 'Processing Job Details...'}
                         {status === Status.ANALYZING && 'Analyzing Match Viability...'}
                         {status === Status.GENERATING && 'Tailoring your CV...'}
                         {status === Status.SEARCHING_JOBS && 'Scouring the web for your perfect role...'}
                     </h3>
                     <p className="text-slate-500 mt-2">
                        {status === Status.SEARCHING_JOBS 
                            ? "Analyzing CV keywords, searching top boards, and ranking by relevance." 
                            : "Please wait while our AI models work their magic."}
                     </p>
                 </div>
                 {!isPaidUser && (
                     <div className="w-full flex justify-center mt-8">
                         <AdBanner suffix="loading" format="rectangle" />
                     </div>
                 )}
             </div>
          )}

          {/* JOB FINDER RESULTS */}
          {appMode === 'finder' && foundJobs.length > 0 && (
             <div className="space-y-6 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-slate-800">Top Matched Jobs</h3>
                    <Button onClick={() => { setFoundJobs([]); setStatus(Status.IDLE); }} variant="secondary" className="text-sm py-2">New Search</Button>
                 </div>
                 
                 <div className="grid gap-6">
                    {foundJobs.map((job, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-all p-6 relative">
                             <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                {job.matchScore}% Match
                             </div>
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h4 className="text-xl font-bold text-slate-900">{job.title}</h4>
                                    <p className="text-slate-600 font-medium">{job.company} • {job.location}</p>
                                    <p className="text-xs text-slate-400 mt-1">Posted: {job.datePosted}</p>
                                 </div>
                             </div>
                             
                             <div className="bg-slate-50 p-4 rounded-lg my-4 text-sm text-slate-700">
                                 <p className="italic mb-2">"{job.analysis}"</p>
                                 <p className="text-xs text-slate-500 border-t border-slate-200 pt-2 mt-2">{job.descriptionSnippet}</p>
                             </div>

                             <div className="flex gap-3">
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                                    View Job
                                </a>
                                <button 
                                    onClick={() => generateFromFinder(job)}
                                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Generate CV
                                </button>
                             </div>
                        </div>
                    ))}
                 </div>
             </div>
          )}

          {/* TAILOR RESULTS (Existing) */}
          {status === Status.ANALYSIS_COMPLETE && analysis && appMode === 'tailor' && (
              <div className="space-y-6 no-print">
                  <div className="flex items-center gap-2 text-slate-500 mb-2 cursor-pointer hover:text-indigo-600" onClick={reset}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7m-7 7h18" /></svg>
                      Back to Inputs
                  </div>
                  <AnalysisDashboard />
              </div>
          )}

          {status === Status.SUCCESS && result && (
            <div className="animate-fade-in space-y-6">
               <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 no-print">
                   <div className="bg-white p-2 rounded-full shadow-sm">
                       <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <div>
                       <p className="font-bold">Document Generated Successfully</p>
                       {!user && <p className="text-xs text-green-700 mt-1 cursor-pointer underline" onClick={() => setShowAuthModal(true)}>Sign in to save this to your history.</p>}
                       {user && hasSavedCurrentResult && <p className="text-xs text-green-700 mt-1">Saved to your history.</p>}
                   </div>
                   <Button onClick={reset} variant="secondary" className="text-sm h-10 ml-auto">Create New</Button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 space-y-6 no-print">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Downloads</h3>
                            {!isPaidUser && <AdBanner className="mb-6" suffix="download" format="rectangle" />}
                            <div className="space-y-3">
                                <Button onClick={initiateDownloadBundle} className="w-full justify-between bg-indigo-600 hover:bg-indigo-700 h-14" isLoading={isZipping}>
                                    <span className="flex items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-bold">Download Bundle</span>
                                            <span className="text-[10px] text-indigo-200">PDF + DOCX (CV & Letter)</span>
                                        </div>
                                    </span>
                                </Button>
                                {!isPaidUser && <p className="text-[10px] text-center text-slate-400">Watch a short ad to download for free.</p>}
                            </div>
                        </div>
                        {!isPaidUser && <ProPlusFeatureCard onUpgrade={scrollToPlans} />}
                   </div>

                   <div className="lg:col-span-2">
                       <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[600px] flex flex-col">
                           <div className="bg-slate-100 p-0 border-b border-slate-200 flex justify-between items-center no-print">
                               <div className="flex">
                                   <button onClick={() => setPreviewTab('cv')} className={`px-6 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${previewTab === 'cv' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>CV Preview</button>
                                   <button onClick={() => setPreviewTab('cl')} className={`px-6 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${previewTab === 'cl' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Cover Letter</button>
                               </div>
                           </div>
                           <div className="p-8 h-[600px] overflow-auto relative bg-white">
                               <div className="relative z-0 prose prose-sm max-w-none text-slate-800">
                                   {previewTab === 'cv' && result.cvData ? (
                                       <CVTemplate data={result.cvData} />
                                   ) : (
                                       <ReactMarkdown components={markdownComponents}>
                                         {result.coverLetter?.content || ''}
                                       </ReactMarkdown>
                                   )}
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
            </div>
          )}

          {status === Status.REJECTED && result && (
            <div className="bg-white rounded-2xl shadow-xl border-l-8 border-red-500 p-8 space-y-6 animate-fade-in no-print">
              {/* Rejection UI */}
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Not Recommended</h2>
                    <p className="text-slate-600 mb-6">System analysis suggests a weak match.</p>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-4">
                        <div>
                            <h4 className="font-bold text-red-800 mb-1">Reason:</h4>
                            <p className="text-red-700">{result.rejectionDetails?.reason}</p>
                        </div>
                    </div>
                 </div>
              </div>
              {!isPaidUser && <AdBanner suffix="reject" format="horizontal" />}
              <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                 <Button variant="secondary" onClick={reset} className="w-full md:w-auto">Try a Different Role</Button>
                 <Button variant="primary" onClick={() => handleGenerate(true)} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900">Force Generation</Button>
              </div>
            </div>
          )}

          {/* PLANS SECTION (Visible to all) */}
          <PlansSection />

        </main>
        
        <footer className="text-center text-slate-400 text-sm py-8 space-y-2 border-t border-slate-200 mt-12 no-print">
          <p>&copy; {new Date().getFullYear()} CV Tailor Pro.</p>
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => setShowPrivacyModal(true)} className="text-slate-400 hover:text-slate-600 underline underline-offset-2 text-xs">Privacy Policy & Terms</button>
            <p className="text-xs">Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-400 hover:underline">customerservice@goapply.co.za</a></p>
          </div>
        </footer>
      </div>
    </div>
  );
};
