
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
import { LimitReachedModal } from './components/LimitReachedModal';
import CVTemplate from './components/CVTemplate'; 
import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch } from './services/geminiService';
import { updateUserSubscription, getPlanDetails } from './services/subscriptionService';
import { authService } from './services/authService';
import { checkUsageLimit, incrementUsage, getUsageCount } from './services/usageService';
import { FileData, GeneratorResponse, Status, MatchAnalysis, UserProfile, SavedApplication, ManualCVData, ManualExperienceItem, ManualEducationItem } from './types';
import { GEMINI_KEY_1 } from './constants';
import { createWordBlob } from './utils/docHelper';
import { generatePdfFromApi } from './utils/pdfHelper';
import { supabase } from './services/supabaseClient';

export const App: React.FC = () => {

  // User & Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Input Modes
  const [cvInputMode, setCvInputMode] = useState<'upload' | 'scratch'>('upload');
  const [file, setFile] = useState<FileData | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // --- Manual Form State ---
  const [manualData, setManualData] = useState<ManualCVData>({
    fullName: '', 
    email: '', 
    phone: '',
    location: '',
    summary: '', 
    experience: [], 
    education: [], 
    skills: []
  });

  // Temp State for "Adding" items
  const [tempExp, setTempExp] = useState<ManualExperienceItem>({
      id: '', title: '', company: '', startDate: '', endDate: '', description: ''
  });
  const [tempEdu, setTempEdu] = useState<ManualEducationItem>({
      id: '', degree: '', school: '', year: ''
  });
  const [tempSkill, setTempSkill] = useState('');

  // Job Target Modes
  const [targetMode, setTargetMode] = useState<'url' | 'text' | 'title'>('text');
  const [jobLink, setJobLink] = useState('');
  const [manualJobText, setManualJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobSpec, setJobSpec] = useState(''); 
  
  const [apiKey] = useState(GEMINI_KEY_1);
  
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [hasSavedCurrentResult, setHasSavedCurrentResult] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingLimitAction, setPendingLimitAction] = useState<(() => void) | null>(null);
  const [adContext, setAdContext] = useState<'download' | 'limit_reward'>('download');

  const [isPaidUser, setIsPaidUser] = useState(false); 
  const [dailyLimit, setDailyLimit] = useState(1); 
  const [currentPlanName, setCurrentPlanName] = useState('Free');
  const [isMaxPlan, setIsMaxPlan] = useState(false);

  const [paymentTriggerPlan, setPaymentTriggerPlan] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState(false);
  
  const [dailyCvCount, setDailyCvCount] = useState<number>(0);

  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  const [isZipping, setIsZipping] = useState(false);

  // --- Init ---
  useEffect(() => {
    checkUserSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
     const fetchCount = async () => {
         const cv = await getUsageCount(user?.id);
         setDailyCvCount(cv);
     };
     fetchCount();
     window.addEventListener('focus', fetchCount);
     return () => window.removeEventListener('focus', fetchCount);
  }, [user]);

  useEffect(() => {
      if (user && pendingPayment) {
          setPendingPayment(false);
          setShowPaymentModal(true);
      }
  }, [user, pendingPayment]);

  useEffect(() => {
    if (user && result && !hasSavedCurrentResult && status === Status.SUCCESS) {
        saveCurrentResultToHistory();
    }
  }, [user, result, hasSavedCurrentResult, status]);

  // --- Auth & Profile ---
  const checkUserSession = async () => {
    const profile = await authService.getCurrentProfile();
    setUser(profile);
    
    let planLimit = 1;
    let planName = 'Free';
    let isPaid = false;
    let maxPlan = false;

    if (profile) {
        if (profile.email === 'mqhele03@gmail.com') {
            planLimit = 10000;
            planName = 'Admin Unlimited';
            isPaid = true;
            maxPlan = true;
        } else {
            const isExpired = profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date();
            if (!isExpired && profile.plan_id) {
                const planDetails = getPlanDetails(profile.plan_id);
                if (planDetails.id !== 'free') {
                    planLimit = planDetails.dailyLimit;
                    planName = planDetails.name;
                    isPaid = true;
                    if (planDetails.id === 'tier_4') maxPlan = true;
                }
            }
        }
    }
    
    setDailyLimit(planLimit);
    setCurrentPlanName(planName);
    setIsPaidUser(isPaid);
    setIsMaxPlan(maxPlan);
  };

  // --- Handlers ---
  const handleSettingsUpgrade = () => {
      setShowSettingsModal(false);
      setTimeout(() => setShowPaymentModal(true), 200);
  };

  const handleLimitAdWatch = () => {
      setShowLimitModal(false);
      setAdContext('limit_reward');
      setShowRewardedModal(true);
  };

  const handleLimitUpgrade = () => {
      setShowLimitModal(false);
      setShowPaymentModal(true);
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

  // --- Manual Entry Logic ---
  const addExperience = () => {
      if (!tempExp.title || !tempExp.company) return;
      setManualData(prev => ({
          ...prev,
          experience: [...prev.experience, { ...tempExp, id: Date.now().toString() }]
      }));
      setTempExp({ id: '', title: '', company: '', startDate: '', endDate: '', description: '' });
  };

  const removeExperience = (id: string) => {
      setManualData(prev => ({
          ...prev,
          experience: prev.experience.filter(item => item.id !== id)
      }));
  };

  const addEducation = () => {
      if (!tempEdu.degree || !tempEdu.school) return;
      setManualData(prev => ({
          ...prev,
          education: [...prev.education, { ...tempEdu, id: Date.now().toString() }]
      }));
      setTempEdu({ id: '', degree: '', school: '', year: '' });
  };

  const removeEducation = (id: string) => {
      setManualData(prev => ({
          ...prev,
          education: prev.education.filter(item => item.id !== id)
      }));
  };

  const addSkill = () => {
      if (!tempSkill.trim()) return;
      setManualData(prev => ({
          ...prev,
          skills: [...prev.skills, tempSkill.trim()]
      }));
      setTempSkill('');
  };

  const removeSkill = (skill: string) => {
      setManualData(prev => ({
          ...prev,
          skills: prev.skills.filter(s => s !== skill)
      }));
  };


  const extractCompanyAndRole = (): { company: string, role: string } => {
      let company = 'Company';
      let role = 'Role';

      if (targetMode === 'title') {
          role = jobTitle.trim() || 'Role';
          company = 'General Application';
      } else {
          if (analysis?.jobTitle) role = analysis.jobTitle;
          if (analysis?.company) company = analysis.company;
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
          const baseName = getFilename('cv').replace(' - CV', ''); 

          if (result.cvData) {
              const cvDocBlob = await createWordBlob('hidden-cv-content');
              if (cvDocBlob) zip.file(`${baseName} - CV.docx`, cvDocBlob);
          }

          if (result.coverLetter) {
              const clDocBlob = await createWordBlob('hidden-cl-content');
              if (clDocBlob) zip.file(`${baseName} - Cover Letter.docx`, clDocBlob);
          }
          
          const cvElement = document.getElementById('hidden-cv-content');
          if (cvElement) {
              cvElement.classList.remove('no-print');
              const cvPdfBlob = await generatePdfFromApi('hidden-cv-content');
              if (cvPdfBlob) zip.file(`${baseName} - CV.pdf`, cvPdfBlob);
          }
          
          const clElement = document.getElementById('hidden-cl-content');
          if (clElement) {
              clElement.classList.remove('no-print');
              const clPdfBlob = await generatePdfFromApi('hidden-cl-content');
              if (clPdfBlob) zip.file(`${baseName} - Cover Letter.pdf`, clPdfBlob);
          }

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
      if (cvInputMode === 'scratch') {
          if (!manualData.fullName) return false;
          // Must have at least one experience item
          if (manualData.experience.length === 0) return false;
      }
      
      if (targetMode === 'url' && !jobLink) return false;
      if (targetMode === 'text' && !manualJobText.trim()) return false;
      if (targetMode === 'title' && !jobTitle.trim()) return false;
      
      return true;
  };

  // --- TAILOR HANDLER ---
  const handleScanAndAnalyze = async () => {
      if (!validateInputs()) return;
      
      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');
      setHasSavedCurrentResult(false);

      try {
          let textToAnalyze = '';

          if (targetMode === 'title') {
              setJobSpec(jobTitle);
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
          if (errorMessage.includes("blocks automated scanning")) {
              setErrorMsg(`${errorMessage} We've switched you to Text mode.`);
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
            JSON.stringify(result.cvData),
            result.coverLetter?.content || '',
            analysis?.matchScore || 0
        );
        setHasSavedCurrentResult(true);
      } catch (e) {
          console.error("Failed to auto-save to history:", e);
      }
  };

  const handleGenerate = async (forceOverride: boolean = false, isDirectTitleMode: boolean = false, bypassLimit: boolean = false) => {
    const canProceed = bypassLimit || await checkUsageLimit(user?.id, dailyLimit);
    const isAdmin = user?.email === 'mqhele03@gmail.com';

    if (!canProceed && !isAdmin) {
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
          if (!isAdmin) {
             await incrementUsage(user?.id);
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
      } catch (e) {
          console.error("Failed to load history item", e);
          alert("Could not load this application.");
      }
  };

  const initiateDownloadBundle = () => {
      if (isPaidUser) {
          executeZipDownload();
          return;
      }
      setShowSupportModal(true);
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
  
  const AnalysisDashboard = () => {
      if (!analysis) return null;
      const isPositive = analysis.decision === 'APPLY';
      const colorClass = isPositive ? 'border-green-200 bg-green-50' : analysis.decision === 'CAUTION' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
      const textClass = isPositive ? 'text-green-800' : analysis.decision === 'CAUTION' ? 'text-amber-800' : 'text-red-800';

      return (
        <div className={`rounded-xl border p-6 mb-8 ${colorClass}`}>
           <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full bg-white shadow-sm ${textClass}`}>
                 {isPositive ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 )}
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-lg font-bold ${textClass}`}>{analysis.headline}</h3>
                        <p className="text-sm font-medium opacity-80 mt-1">{analysis.matchScore}% Match Score</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white shadow-sm ${textClass}`}>
                        {analysis.decision}
                    </span>
                 </div>
                 <p className="mt-3 text-slate-700 text-sm leading-relaxed">{analysis.reasoning}</p>
              </div>
           </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
       <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
         <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h1 className="font-bold text-xl tracking-tight text-slate-800">CV Tailor <span className="text-indigo-600">Pro</span></h1>
            </div>

            <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-bold text-slate-500 mr-1 md:mr-2 bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full whitespace-nowrap">
                    <span className={dailyCvCount >= dailyLimit && !isMaxPlan ? 'text-red-500' : 'text-indigo-600'}>
                         Credits: {isMaxPlan ? '∞' : Math.max(0, dailyLimit - dailyCvCount)}
                    </span>
                 </div>
                 {user ? (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSettingsModal(true)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                            {user.full_name || user.email?.split('@')[0]}
                        </button>
                    </div>
                 ) : (
                    <div className="flex items-center gap-2">
                         <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-slate-600 hover:text-indigo-600 px-3 py-2">
                             Log In
                         </button>
                    </div>
                 )}
            </div>
         </div>
       </nav>

       <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>{errorMsg}</div>
                </div>
            )}

            <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. CV INPUT */}
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                 <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">1. Your CV</h2>
                                 <div className="flex bg-slate-100 p-1 rounded-lg">
                                     <button onClick={() => setCvInputMode('upload')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'upload' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Upload</button>
                                     <button onClick={() => setCvInputMode('scratch')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'scratch' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Fill Form</button>
                                 </div>
                             </div>

                             {cvInputMode === 'upload' ? (
                                 <FileUpload onFileSelect={setFile} selectedFileName={file?.name} />
                             ) : (
                                 <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-4">
                                     {/* Personal Info */}
                                     <div className="space-y-3 pb-4 border-b border-slate-100">
                                         <input placeholder="Full Name" className="w-full p-2 border rounded text-sm" value={manualData.fullName} onChange={e => setManualData({...manualData, fullName: e.target.value})} />
                                         <div className="grid grid-cols-2 gap-2">
                                             <input placeholder="Email" className="w-full p-2 border rounded text-sm" value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} />
                                             <input placeholder="Phone" className="w-full p-2 border rounded text-sm" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} />
                                         </div>
                                         <input placeholder="Location (City, Country)" className="w-full p-2 border rounded text-sm" value={manualData.location} onChange={e => setManualData({...manualData, location: e.target.value})} />
                                         <textarea placeholder="Professional Summary..." className="w-full p-2 border rounded text-sm h-16 resize-none" value={manualData.summary} onChange={e => setManualData({...manualData, summary: e.target.value})} />
                                     </div>

                                     {/* Experience Section */}
                                     <div className="space-y-3 pb-4 border-b border-slate-100">
                                         <h3 className="text-xs font-bold text-slate-500 uppercase">Experience</h3>
                                         {/* List Added Experiences */}
                                         {manualData.experience.map(exp => (
                                             <div key={exp.id} className="bg-slate-50 p-2 rounded border border-slate-200 text-sm flex justify-between items-start">
                                                 <div>
                                                     <div className="font-bold text-slate-800">{exp.title}</div>
                                                     <div className="text-xs text-slate-600">{exp.company} | {exp.startDate} - {exp.endDate}</div>
                                                 </div>
                                                 <button onClick={() => removeExperience(exp.id)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                             </div>
                                         ))}
                                         {/* Add New Experience Form */}
                                         <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                                             <input placeholder="Job Title" className="w-full p-2 border rounded text-xs bg-white" value={tempExp.title} onChange={e => setTempExp({...tempExp, title: e.target.value})} />
                                             <input placeholder="Company" className="w-full p-2 border rounded text-xs bg-white" value={tempExp.company} onChange={e => setTempExp({...tempExp, company: e.target.value})} />
                                             <div className="grid grid-cols-2 gap-2">
                                                <input placeholder="Start Date" className="w-full p-2 border rounded text-xs bg-white" value={tempExp.startDate} onChange={e => setTempExp({...tempExp, startDate: e.target.value})} />
                                                <input placeholder="End Date" className="w-full p-2 border rounded text-xs bg-white" value={tempExp.endDate} onChange={e => setTempExp({...tempExp, endDate: e.target.value})} />
                                             </div>
                                             <textarea placeholder="Responsibilities & Achievements..." className="w-full p-2 border rounded text-xs h-16 bg-white" value={tempExp.description} onChange={e => setTempExp({...tempExp, description: e.target.value})} />
                                             <button onClick={addExperience} className="w-full py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200">Add Experience</button>
                                         </div>
                                     </div>

                                     {/* Education Section */}
                                     <div className="space-y-3 pb-4 border-b border-slate-100">
                                         <h3 className="text-xs font-bold text-slate-500 uppercase">Education</h3>
                                          {manualData.education.map(edu => (
                                             <div key={edu.id} className="bg-slate-50 p-2 rounded border border-slate-200 text-sm flex justify-between items-start">
                                                 <div>
                                                     <div className="font-bold text-slate-800">{edu.degree}</div>
                                                     <div className="text-xs text-slate-600">{edu.school}, {edu.year}</div>
                                                 </div>
                                                 <button onClick={() => removeEducation(edu.id)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                             </div>
                                         ))}
                                         <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                                             <input placeholder="Degree / Qualification" className="w-full p-2 border rounded text-xs bg-white" value={tempEdu.degree} onChange={e => setTempEdu({...tempEdu, degree: e.target.value})} />
                                             <div className="grid grid-cols-2 gap-2">
                                                <input placeholder="School / Institution" className="w-full p-2 border rounded text-xs bg-white" value={tempEdu.school} onChange={e => setTempEdu({...tempEdu, school: e.target.value})} />
                                                <input placeholder="Year" className="w-full p-2 border rounded text-xs bg-white" value={tempEdu.year} onChange={e => setTempEdu({...tempEdu, year: e.target.value})} />
                                             </div>
                                             <button onClick={addEducation} className="w-full py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200">Add Education</button>
                                         </div>
                                     </div>

                                     {/* Skills Section */}
                                     <div className="space-y-3">
                                         <h3 className="text-xs font-bold text-slate-500 uppercase">Skills & Tools</h3>
                                         <div className="flex flex-wrap gap-2">
                                             {manualData.skills.map(skill => (
                                                 <span key={skill} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-200">
                                                     {skill}
                                                     <button onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-500">&times;</button>
                                                 </span>
                                             ))}
                                         </div>
                                         <div className="flex gap-2">
                                             <input 
                                                placeholder="Add a skill (e.g. React, Python)" 
                                                className="flex-1 p-2 border rounded text-xs" 
                                                value={tempSkill} 
                                                onChange={e => setTempSkill(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addSkill()}
                                             />
                                             <button onClick={addSkill} className="px-3 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-200">Add</button>
                                         </div>
                                     </div>

                                 </div>
                             )}

                             {/* LinkedIn (Optional) */}
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn URL (Optional)</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="https://linkedin.com/in/username"
                                    value={linkedinUrl}
                                    onChange={e => setLinkedinUrl(e.target.value)}
                                 />
                             </div>
                        </div>

                        {/* 2. JOB INPUT */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                 <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">2. Target Job</h2>
                                 <div className="flex bg-slate-100 p-1 rounded-lg">
                                     <button onClick={() => setTargetMode('url')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'url' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Link</button>
                                     <button onClick={() => setTargetMode('text')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'text' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Text</button>
                                     <button onClick={() => setTargetMode('title')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetMode === 'title' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Title</button>
                                 </div>
                             </div>

                             <div className="bg-white p-6 rounded-xl border border-slate-300 h-[210px] flex flex-col justify-center">
                                 {targetMode === 'url' && (
                                     <div className="space-y-2">
                                         <p className="text-sm text-slate-600">Paste the job posting URL. We'll extract the details.</p>
                                         <input type="url" placeholder="https://linkedin.com/jobs/..." className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" value={jobLink} onChange={e => setJobLink(e.target.value)} />
                                     </div>
                                 )}
                                 {targetMode === 'text' && (
                                     <textarea className="w-full h-full p-2 text-sm border-none focus:ring-0 resize-none" placeholder="Paste the full job description here..." value={manualJobText} onChange={e => setManualJobText(e.target.value)} />
                                 )}
                                 {targetMode === 'title' && (
                                     <div className="space-y-2">
                                         <p className="text-sm text-slate-600">Enter a Job Title. We'll optimize for industry standards.</p>
                                         <input type="text" placeholder="e.g. Senior Project Manager" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-200">
                        {targetMode !== 'title' && (
                            <Button variant="secondary" onClick={handleScanAndAnalyze} isLoading={status === Status.SCANNING || status === Status.ANALYZING} disabled={status === Status.GENERATING || !validateInputs()} className="flex-1">
                                Step 1: Analyze Match
                            </Button>
                        )}
                        <Button onClick={() => handleGenerate(false, targetMode === 'title')} isLoading={status === Status.GENERATING} disabled={!validateInputs()} className="flex-1 shadow-lg shadow-indigo-200">
                            {targetMode === 'title' ? 'Generate Standard CV' : 'Step 2: Generate Tailored CV'}
                        </Button>
                    </div>

                    <AnalysisDashboard />
                    {!isPaidUser && <AdBanner />}

                    {result && status === Status.SUCCESS && (
                        <div className="animate-fade-in mt-12">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Your Application Package</h2>
                                <div className="flex bg-slate-200 p-1 rounded-lg">
                                    <button onClick={() => setPreviewTab('cv')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${previewTab === 'cv' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>CV Preview</button>
                                    <button onClick={() => setPreviewTab('cl')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${previewTab === 'cl' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Cover Letter</button>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[800px]">
                                {previewTab === 'cv' && result.cvData ? (
                                    <div className="overflow-x-auto bg-slate-100 p-8 flex justify-center">
                                        <div id="cv-preview-content" className="bg-white shadow-lg origin-top scale-90 md:scale-100">
                                            <CVTemplate data={result.cvData} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 max-w-3xl mx-auto prose prose-slate">
                                        <div id="cl-preview-content">
                                            <ReactMarkdown components={markdownComponents}>{result.coverLetter?.content || ''}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-4 z-30 mt-6 mx-auto max-w-lg">
                                <div className="bg-slate-900 text-white p-2 pl-6 rounded-full shadow-2xl flex items-center justify-between">
                                    <span className="font-bold text-sm">Ready to apply?</span>
                                    <button onClick={initiateDownloadBundle} disabled={isZipping} className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95">
                                        {isZipping ? 'Preparing...' : 'Download Bundle'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                 {result?.cvData && <div id="hidden-cv-content" style={{ width: '816px', backgroundColor: 'white' }}><CVTemplate data={result.cvData} /></div>}
                 {result?.coverLetter?.content && <div id="hidden-cl-content" style={{ width: '816px', padding: '72px', backgroundColor: 'white', fontFamily: 'Calibri, sans-serif' }}><ReactMarkdown components={markdownComponents}>{result.coverLetter.content}</ReactMarkdown></div>}
            </div>
       </main>

       <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-slate-400 text-xs">
           <div className="flex justify-center gap-4 mb-4">
              <button onClick={() => setShowPrivacyModal(true)} className="hover:text-slate-600">Privacy Policy</button>
              <button onClick={() => setShowSupportModal(true)} className="hover:text-slate-600">Support</button>
              <a href="mailto:customerservice@goapply.co.za" className="hover:text-slate-600">Contact</a>
           </div>
           <p>© {new Date().getFullYear()} CV Tailor Pro. Powered by Gemini 3.</p>
       </footer>

       <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
       <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess} documentTitle={result?.cvData?.title || 'CV Bundle'} existingOrderId={null} triggerPlanId={paymentTriggerPlan} />
       <RewardedAdModal isOpen={showRewardedModal} onClose={() => setShowRewardedModal(false)} onComplete={handleAdComplete} />
       <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} onConfirmSupport={() => { setShowSupportModal(false); setShowPaymentModal(true); }} onContinueFree={() => { setShowSupportModal(false); setAdContext('download'); setShowRewardedModal(true); }} />
       <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => checkUserSession()} />
       <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} onLoadApplication={handleLoadHistory} />
       <AccountSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} user={user} onProfileUpdate={checkUserSession} onUpgradeClick={handleSettingsUpgrade} />
       <LimitReachedModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} onWatchAd={handleLimitAdWatch} onUpgrade={handleLimitUpgrade} isMaxPlan={isMaxPlan} />
    </div>
  );
};