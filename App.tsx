
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
  const [dailyLimit, setDailyLimit] = useState(0); // Default 0 for Free
  const [jobSearchLimit, setJobSearchLimit] = useState(0); // Default 0 for Free
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
    let planLimit = 0; // Updated Free Limit
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
      setDailyLimit(0);
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
  // Updated: Credits are NO LONGER checked here. Analysis is free.
  const handleScanAndAnalyze = async () => {
      if (!validateInputs()) return;

      // Note: We deliberately removed checkUsageLimit here. Analysis is free.
      
      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');
      setHasSavedCurrentResult(false);

      try {
          let textToAnalyze = '';

          if (targetMode === 'title') {
              setJobSpec(jobTitle);
              // We pass 'false' for bypassLimit so handleGenerate WILL check credits
              handleGenerate(false, true, false); 
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
    // 1. Check Usage Limit (This is where we charge credits)
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

  // Updated: Removed credit limit checks. Handover is free.
  const generateFromFinder = async (job: JobSearchResult) => {
      // 1. Switch to Tailor Mode
      setAppMode('tailor');
      
      // 2. Set to URL mode and populate
      setTargetMode('url');
      setJobLink(job.url);
      setManualJobText(''); 
      setJobTitle('');

      // Scroll to top to show the inputs
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
      const colorClass = isPositive ? 'border-green-200 bg-green-50'