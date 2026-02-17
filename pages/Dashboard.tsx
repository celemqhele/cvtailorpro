
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useOutletContext, useNavigate, useLocation, Link } from 'react-router-dom';

import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { AdBanner } from '../components/AdBanner';
import { RewardedAdModal } from '../components/RewardedAdModal';
import { SupportModal } from '../components/SupportModal';
import { HistoryModal } from '../components/HistoryModal';
import { LimitReachedModal } from '../components/LimitReachedModal';
import { ProPlusFeatureCard } from '../components/ProPlusFeatureCard';
import { AdDecisionModal } from '../components/AdDecisionModal';
import { FeatureLockedModal } from '../components/FeatureLockedModal';

import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch, extractTextFromFile, generateSkeletonCV } from '../services/geminiService';
import { authService } from '../services/authService';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { getPlanDetails } from '../services/subscriptionService';
import { FileData, GeneratorResponse, Status, MatchAnalysis, SavedApplication, ManualCVData, ManualExperienceItem, ManualEducationItem } from '../types';
import { GEMINI_KEY_1 } from '../constants';

interface DashboardProps {
    mode: 'user' | 'guest';
}

const STORAGE_KEY = 'cv_tailor_dashboard_state';

export const Dashboard: React.FC<DashboardProps> = ({ mode }) => {
  // Context from Layout
  const { 
      user, 
      dailyLimit, 
      isPaidUser, 
      isMaxPlan, 
      setDailyCvCount, 
      triggerAuth, 
      triggerPayment,
      checkUserSession,
      dailyCvCount
  } = useOutletContext<any>();

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect Logic - Only strict for logged-in user dashboard
  useEffect(() => {
    if (mode === 'user' && user === null) {
         const timeout = setTimeout(() => {
             if (!user) navigate('/'); 
         }, 1000);
         return () => clearTimeout(timeout);
    }
    
    if (mode === 'guest' && user) {
        navigate('/dashboard');
    }
  }, [mode, user, navigate]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAdDecisionModal, setShowAdDecisionModal] = useState(false);
  
  // Confirmation Modal State
  const [showRemoveCvModal, setShowRemoveCvModal] = useState(false);
  const [showSkeletonLockModal, setShowSkeletonLockModal] = useState(false);
  
  // Input Modes
  const [cvInputMode, setCvInputMode] = useState<'upload' | 'scratch' | 'skeleton'>('upload');
  const [file, setFile] = useState<FileData | null>(null);
  
  // Saved CV State
  const [savedCvText, setSavedCvText] = useState<string | null>(null);
  const [savedCvFilename, setSavedCvFilename] = useState<string | null>(null);
  const [useSavedCv, setUseSavedCv] = useState(false);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // Additional Info State (New Feature)
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const additionalFileRef = useRef<HTMLInputElement>(null);
  
  // --- Manual Form State ---
  const [manualData, setManualData] = useState<ManualCVData>({
    fullName: '', email: '', phone: '', location: '', summary: '', experience: [], education: [], skills: []
  });

  // Job Target Modes
  const [targetMode, setTargetMode] = useState<'url' | 'text' | 'title'>('text');
  const [jobLink, setJobLink] = useState('');
  const [manualJobText, setManualJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobSpec, setJobSpec] = useState(''); 
  
  // Specific Job Application Link (from Find Jobs)
  const [directApplyLink, setDirectApplyLink] = useState<string | null>(null);

  const [apiKey] = useState(GEMINI_KEY_1);
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedCvId, setGeneratedCvId] = useState<string | null>(null);
  
  // Pending actions for ad completion
  const [pendingGenParams, setPendingGenParams] = useState<{force: boolean, isTitle: boolean, isSkeleton: boolean} | null>(null);
  const [adContext, setAdContext] = useState<'generation' | 'download'>('generation');

  const previewRef = useRef<HTMLDivElement>(null);

  // Check Plan Details for Features
  const userPlan = user?.plan_id ? getPlanDetails(user.plan_id) : getPlanDetails('free');
  const hasSkeletonAccess = userPlan.hasSkeletonMode;

  // Load Saved CV from User Profile
  useEffect(() => {
    if (user && user.last_cv_content && user.last_cv_filename) {
        setSavedCvText(user.last_cv_content);
        setSavedCvFilename(user.last_cv_filename);
        setUseSavedCv(true); // Default to using saved CV if available
    }
  }, [user]);

  // Restore State from Session Storage on Mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.cvInputMode) setCvInputMode(parsed.cvInputMode);
            if (parsed.manualData) setManualData(parsed.manualData);
            if (parsed.linkedinUrl) setLinkedinUrl(parsed.linkedinUrl);
            if (parsed.additionalInfo) setAdditionalInfo(parsed.additionalInfo);
            
            if (!location.state?.autofillJobDescription) {
                 if (parsed.targetMode) setTargetMode(parsed.targetMode);
                 if (parsed.jobLink) setJobLink(parsed.jobLink);
                 if (parsed.manualJobText) setManualJobText(parsed.manualJobText);
                 if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
                 if (parsed.directApplyLink) setDirectApplyLink(parsed.directApplyLink);
            }
        } catch (e) {
            console.error("Failed to restore dashboard state", e);
        }
    }
  }, []); 

  // Save State to Session Storage on Change
  useEffect(() => {
    const stateToSave = {
        cvInputMode,
        manualData,
        linkedinUrl,
        additionalInfo,
        targetMode,
        jobLink,
        manualJobText,
        jobTitle,
        directApplyLink
    };
    
    const handler = setTimeout(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, 500);

    return () => clearTimeout(handler);
  }, [cvInputMode, manualData, linkedinUrl, additionalInfo, targetMode, jobLink, manualJobText, jobTitle, directApplyLink]);


  // Check for incoming job data from "Find Jobs"
  useEffect(() => {
      if (location.state && location.state.autofillJobDescription) {
          setTargetMode('text');
          setManualJobText(location.state.autofillJobDescription);
          if (location.state.autofillApplyLink) {
              setDirectApplyLink(location.state.autofillApplyLink);
          }
      }
  }, [location.state]);

  useEffect(() => {
    if (status === Status.SUCCESS && result && previewRef.current) {
        setTimeout(() => {
            previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
  }, [status, result]);

  // --- Handlers ---

  const handleSkeletonClick = () => {
      if (!hasSkeletonAccess) {
          setShowSkeletonLockModal(true);
      } else {
          setCvInputMode('skeleton');
      }
  };

  const handleLimitUpgrade = (withDiscount: boolean) => {
      setShowLimitModal(false);
      triggerPayment(undefined, withDiscount);
  };

  const handleAdDecisionWatch = () => {
      setShowAdDecisionModal(false);
      setAdContext('generation');
      setShowRewardedModal(true);
  };

  const handleAdDecisionUpgrade = () => {
      setShowAdDecisionModal(false);
      triggerPayment();
  };

  const handleAdComplete = () => {
      setShowRewardedModal(false);
      
      if (adContext === 'generation' && pendingGenParams) {
          // Resume generation after ad
          if (pendingGenParams.isSkeleton) {
              handleGenerateSkeleton(true); // true = bypassAd
          } else {
              handleGenerate(pendingGenParams.force, pendingGenParams.isTitle, true); // true = bypassAd
          }
          setPendingGenParams(null);
      } else if (adContext === 'download') {
          if (generatedCvId) {
            navigate(`/cv-generated/${generatedCvId}`);
          }
      }
  };

  const handleRemoveCvClick = () => {
      setShowRemoveCvModal(true);
  };

  const handleConfirmRemoveCv = async () => {
      await authService.clearCVFromProfile();
      setSavedCvText(null);
      setSavedCvFilename(null);
      setUseSavedCv(false);
      if (checkUserSession) checkUserSession();
      setShowRemoveCvModal(false);
  };

  const extractCompanyAndRole = () => {
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

  const validateInputs = () => {
      if (cvInputMode === 'upload') {
          if (useSavedCv && savedCvText) {
              // Valid
          } else if (!file) {
              return false;
          }
      } else if (cvInputMode === 'scratch') {
          if (!manualData.fullName) return false;
          if (manualData.experience.length === 0) return false;
      } else if (cvInputMode === 'skeleton') {
          // No CV input needed
      }
      
      if (targetMode === 'url' && !jobLink) return false;
      if (targetMode === 'text' && !manualJobText.trim()) return false;
      if (targetMode === 'title' && !jobTitle.trim()) return false;
      return true;
  };

  const handleAdditionalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessingFile(true);
      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64Content = (reader.result as string).split(',')[1];
              const fileData: FileData = {
                  base64: base64Content,
                  mimeType: file.type || 'text/plain',
                  name: file.name
              };
              
              const text = await extractTextFromFile(fileData);
              // Append to existing text with a clear separator
              setAdditionalInfo(prev => {
                  const prefix = prev ? prev + "\n\n" : "";
                  return prefix + `--- Content from ${file.name} ---\n${text}`;
              });
              
              // Reset file input so same file can be selected again if needed
              if (additionalFileRef.current) additionalFileRef.current.value = '';
          };
          reader.readAsDataURL(file);
      } catch (err) {
          console.error("Failed to read additional file", err);
          alert("Could not read file. Please try copying text manually.");
      } finally {
          setIsProcessingFile(false);
      }
  };

  const handleScanAndAnalyze = async () => {
      if (!validateInputs()) return;
      if (cvInputMode === 'skeleton') {
          // Analysis not needed for Skeleton Mode, go straight to generate suggestion
          alert("For Skeleton Mode, proceed directly to Generation (Step 2).");
          return;
      }

      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');
      setGeneratedCvId(null);
      try {
          // 1. Process Job
          let textToAnalyze = '';
          if (targetMode === 'title') {
              setJobSpec(jobTitle);
              handleGenerate(false, true, false); 
              return;
          } else if (targetMode === 'url') {
              textToAnalyze = await scrapeJobFromUrl(jobLink);
              // In URL mode, the job link itself is the apply link
              setDirectApplyLink(jobLink); 
          } else {
              textToAnalyze = manualJobText;
          }
          if (!textToAnalyze || textToAnalyze.length < 20) throw new Error("Job description is too short.");
          setJobSpec(textToAnalyze);
          
          // 2. Process CV and Autosave if new
          if (cvInputMode === 'upload' && !useSavedCv && file) {
             const extractedText = await extractTextFromFile(file);
             await authService.saveCVToProfile(file.name, extractedText);
             setSavedCvText(extractedText);
             setSavedCvFilename(file.name);
             setUseSavedCv(true); 
             setFile(null);
          }

          // 3. Analyze
          setStatus(Status.ANALYZING);
          const analysisResult = await analyzeMatch(
              file, 
              cvInputMode === 'scratch' ? manualData : null,
              textToAnalyze, 
              apiKey,
              (useSavedCv && savedCvText) ? savedCvText : undefined
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

  const saveCurrentResultToHistory = async (resultOverride?: GeneratorResponse) => {
      const dataToSave = resultOverride || result;
      if (!dataToSave || !dataToSave.cvData) return null;
      try {
        let { company, role } = extractCompanyAndRole();
        
        // Priority 1: AI Extracted Meta (if highly confident)
        if (dataToSave.meta?.jobTitle && 
            dataToSave.meta.jobTitle.toLowerCase() !== 'role' && 
            dataToSave.meta.jobTitle.toLowerCase() !== 'general' &&
            !dataToSave.meta.jobTitle.includes("Extracted")) {
            role = dataToSave.meta.jobTitle;
        } 
        
        // Priority 2: Fallback to Analysis Result if meta is weak
        if ((role === 'Role' || role === 'General') && analysis?.jobTitle && !['role', 'general'].includes(analysis.jobTitle.toLowerCase())) {
             role = analysis.jobTitle;
        }

        // Company Extraction Priority
        if (dataToSave.meta?.company && 
            dataToSave.meta.company.length > 2 && 
            !dataToSave.meta.company.includes("Extracted")) {
            company = dataToSave.meta.company;
        }
        
        // Pass the directApplyLink to the save function
        const savedApp = await authService.saveApplication(
            role, 
            company, 
            JSON.stringify(dataToSave.cvData), 
            dataToSave.coverLetter?.content || '', 
            analysis?.matchScore || 0,
            directApplyLink 
        );
        
        if (savedApp) {
            setGeneratedCvId(savedApp.id);
            return savedApp.id;
        }
      } catch (e) {
          console.error("Failed to auto-save to history:", e);
      }
      return null;
  };

  const handleGenerate = async (forceOverride: boolean = false, isDirectTitleMode: boolean = false, bypassAd: boolean = false) => {
    // 1. Check if user is free and needs to watch ad or is blocked
    if (!isPaidUser && !bypassAd) {
        // If they hit the limit (5), they are done. No more ads. Must upgrade.
        const atLimit = await checkUsageLimit(user?.id, dailyLimit);
        if (!atLimit) {
            setShowLimitModal(true); // Block them
            return;
        }

        // If not at limit, ask them to decide (Ad vs Upgrade)
        setPendingGenParams({ force: forceOverride, isTitle: isDirectTitleMode, isSkeleton: false });
        setShowAdDecisionModal(true);
        return;
    }

    // 2. Double check limit just in case (for paid users too)
    const canProceed = bypassAd || await checkUsageLimit(user?.id, dailyLimit);
    const isAdmin = user?.email === 'mqhele03@gmail.com';

    if (!canProceed && !isAdmin) {
        setShowLimitModal(true);
        return;
    }

    const force = typeof forceOverride === 'boolean' ? forceOverride : false;
    const currentJobSpec = isDirectTitleMode ? jobTitle : jobSpec;
    if (!apiKey.trim()) return;

    setStatus(Status.GENERATING);
    setErrorMsg(null);
    setResult(null);
    setGeneratedCvId(null);
    try {
      
      if (cvInputMode === 'upload' && !useSavedCv && file) {
          const extractedText = await extractTextFromFile(file);
          await authService.saveCVToProfile(file.name, extractedText);
          setSavedCvText(extractedText);
          setSavedCvFilename(file.name);
          setUseSavedCv(true);
          setFile(null);
      }

      const response = await generateTailoredApplication(
          file, 
          cvInputMode === 'scratch' ? manualData : null,
          currentJobSpec,
          targetMode === 'title' ? 'title' : 'specific',
          apiKey, 
          force,
          linkedinUrl,
          (useSavedCv && savedCvText) ? savedCvText : undefined,
          additionalInfo // Pass additional info
      );
      if (response.outcome !== 'REJECT') {
          setResult(response);
          setStatus(Status.SUCCESS);
          if (!isAdmin) {
             await incrementUsage(user?.id);
             setDailyCvCount((prev: number) => prev + 1);
          }
          
          const savedId = await saveCurrentResultToHistory(response);
          if (savedId) {
              // Determine if we should show the subscription popup
              // Logic: Came from Find Jobs Funnel AND is Free Tier/Guest
              const isJobBoardFlow = !!location.state?.autofillJobDescription;
              const showSubscribe = isJobBoardFlow && (!user || user.plan_id === 'free');

              navigate(`/cv-generated/${savedId}`, { state: { showSubscribe } });
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

  const handleGenerateSkeleton = async (bypassAd: boolean = false) => {
      // 1. Process Job Spec
      let textToAnalyze = '';
      if (targetMode === 'title') {
          textToAnalyze = jobTitle;
      } else if (targetMode === 'url') {
          try {
            textToAnalyze = await scrapeJobFromUrl(jobLink);
            setDirectApplyLink(jobLink);
          } catch(e: any) {
             setErrorMsg(e.message);
             return;
          }
      } else {
          textToAnalyze = manualJobText;
      }
      setJobSpec(textToAnalyze);

      // 2. Check Limit
      // We share the same daily limit pool for now (until complex DB migration)
      // but only Growth+ users can access this function anyway.
      const canProceed = bypassAd || await checkUsageLimit(user?.id, dailyLimit);
      const isAdmin = user?.email === 'mqhele03@gmail.com';

      if (!canProceed && !isAdmin) {
          setShowLimitModal(true);
          return;
      }

      setStatus(Status.GENERATING);
      setErrorMsg(null);
      setResult(null);
      setGeneratedCvId(null);

      try {
          const response = await generateSkeletonCV(textToAnalyze, apiKey);
          if (response.outcome !== 'REJECT') {
              setResult(response);
              setStatus(Status.SUCCESS);
              if (!isAdmin) {
                 await incrementUsage(user?.id);
                 setDailyCvCount((prev: number) => prev + 1);
              }
              const savedId = await saveCurrentResultToHistory(response);
              if (savedId) {
                  navigate(`/cv-generated/${savedId}`);
              }
          } else {
              setResult(response);
              setStatus(Status.REJECTED);
          }
      } catch (e: any) {
          console.error(e);
          setStatus(Status.ERROR);
          setErrorMsg(e.message || "Failed to generate skeleton CV.");
      }
  };

  const handleLoadHistory = (app: SavedApplication) => {
      // Intentionally empty
  };

  // Helper for rendering analysis box
  const AnalysisDashboard = () => {
      if (!analysis) return null;
      const isPositive = analysis.decision === 'APPLY';
      const colorClass = isPositive ? 'border-green-200 bg-green-50' : analysis.decision === 'CAUTION' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
      const textClass = isPositive ? 'text-green-800' : analysis.decision === 'CAUTION' ? 'text-amber-800' : 'text-red-800';
      return (
        <div className={`rounded-xl border p-6 mb-8 ${colorClass}`}>
           <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full bg-white shadow-sm ${textClass}`}>
                 {isPositive ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div><h3 className={`text-lg font-bold ${textClass}`}>{analysis.headline}</h3><p className="text-sm font-medium opacity-80 mt-1">{analysis.matchScore}% Match Score</p></div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white shadow-sm ${textClass}`}>{analysis.decision}</span>
                 </div>
                 <p className="mt-3 text-slate-700 text-sm leading-relaxed">{analysis.reasoning}</p>
              </div>
           </div>
        </div>
      );
  };

  // Discount rule: Must not have used discount before, and not currently pro
  const discountEligible = !user || (!user.has_used_discount && !user.is_pro_plus);

  return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h1 className="text-2xl font-bold text-slate-900">{mode === 'guest' ? 'Free CV Generator' : 'Professional Dashboard'}</h1>
                    <p className="text-sm text-slate-500">{mode === 'guest' ? 'Create a tailored CV instantly. Login to save history.' : 'Manage your applications and history.'}</p>
                 </div>
                 {user && mode === 'user' && (
                    <button onClick={() => setShowHistoryModal(true)} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        History
                    </button>
                 )}
                 {!user && mode === 'guest' && (
                     <Button onClick={() => triggerAuth()} variant="secondary" className="text-xs py-2 px-3">Login to Save</Button>
                 )}
            </div>

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>{errorMsg}</div>
                </div>
            )}

            <div className="space-y-8 animate-fade-in">
                    {/* INPUT SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. CV INPUT */}
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                 <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">1. Your CV</h2>
                                 <div className="flex bg-slate-100 p-1 rounded-lg">
                                     <button onClick={() => setCvInputMode('upload')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${cvInputMode === 'upload' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Upload</button>
                                     <button onClick={() => setCvInputMode('scratch')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${cvInputMode === 'scratch' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Form</button>
                                     <button 
                                        onClick={handleSkeletonClick} 
                                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${cvInputMode === 'skeleton' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}
                                     >
                                        Skeleton
                                        {!hasSkeletonAccess && <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                                     </button>
                                 </div>
                             </div>

                             {cvInputMode === 'upload' && (
                                 <>
                                    {useSavedCv && savedCvFilename ? (
                                        <div className="border-2 border-indigo-200 bg-indigo-50 rounded-xl p-6 text-center relative">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="bg-white p-3 rounded-full shadow-sm">
                                                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <h3 className="font-bold text-indigo-900 text-sm">Using Saved CV</h3>
                                                <p className="text-xs text-indigo-700 font-medium">{savedCvFilename}</p>
                                            </div>
                                            
                                            <div className="flex justify-center gap-3 mt-4">
                                                <button 
                                                    onClick={() => { setUseSavedCv(false); setFile(null); }}
                                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline"
                                                >
                                                    Upload different file
                                                </button>
                                                <span className="text-slate-300">|</span>
                                                <button 
                                                    onClick={handleRemoveCvClick}
                                                    className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Remove from Cloud
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <FileUpload onFileSelect={setFile} selectedFileName={file?.name} />
                                            {savedCvFilename && (
                                                <button 
                                                    onClick={() => { setUseSavedCv(true); setFile(null); }}
                                                    className="w-full mt-2 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                                >
                                                    Use saved: {savedCvFilename}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                 </>
                             )}
                             
                             {cvInputMode === 'scratch' && (
                                 <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-4">
                                     <div className="space-y-3 pb-4 border-b border-slate-100">
                                         <input placeholder="Full Name" className="w-full p-2 border rounded text-sm" value={manualData.fullName} onChange={e => setManualData({...manualData, fullName: e.target.value})} />
                                         <div className="grid grid-cols-2 gap-2">
                                             <input placeholder="Email" className="w-full p-2 border rounded text-sm" value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} />
                                             <input placeholder="Phone" className="w-full p-2 border rounded text-sm" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} />
                                         </div>
                                         <input placeholder="Location (City, Country)" className="w-full p-2 border rounded text-sm" value={manualData.location} onChange={e => setManualData({...manualData, location: e.target.value})} />
                                         <textarea placeholder="Professional Summary..." className="w-full p-2 border rounded text-sm h-16 resize-none" value={manualData.summary} onChange={e => setManualData({...manualData, summary: e.target.value})} />
                                     </div>
                                     <div className="p-2 bg-slate-50 rounded text-center text-xs text-slate-500 italic">Manual Entry Form Available</div>
                                 </div>
                             )}

                             {cvInputMode === 'skeleton' && (
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 relative">
                                    <div className="absolute top-2 right-2 bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">GROWTH+</div>
                                    <h3 className="font-bold text-purple-900 mb-2">Skeleton Mode Active</h3>
                                    <p className="text-xs text-purple-800 leading-relaxed">
                                        We will generate a <strong>Perfect Candidate</strong> CV structure based on the job description.
                                        <br/><br/>
                                        It will contain <strong>[Placeholders]</strong> for metrics, dates, and companies. 
                                        You must fill these in after generation to be truthful.
                                    </p>
                                </div>
                             )}

                             {cvInputMode !== 'skeleton' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn URL (Optional)</label>
                                    <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm outline-none" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}/>
                                </div>
                             )}
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
                                         <input type="url" placeholder="https://linkedin.com/jobs/..." className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none" value={jobLink} onChange={e => setJobLink(e.target.value)} />
                                     </div>
                                 )}
                                 {targetMode === 'text' && (
                                     <textarea className="w-full h-full p-2 text-sm border-none focus:ring-0 resize-none" placeholder="Paste the full job description here..." value={manualJobText} onChange={e => setManualJobText(e.target.value)} />
                                 )}
                                 {targetMode === 'title' && (
                                     <div className="space-y-2">
                                         <p className="text-sm text-slate-600">Enter a Job Title. We'll optimize for industry standards.</p>
                                         <input type="text" placeholder="e.g. Senior Project Manager" className="w-full px-4 py-3 rounded-lg border border-slate-300 outline-none" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                    
                    {/* 3. ADDITIONAL INFO (Optional) - Hide for Skeleton */}
                    {cvInputMode !== 'skeleton' && (
                        <div className="mt-6 bg-white p-6 rounded-xl border border-slate-300">
                             <div className="flex items-center justify-between mb-4">
                                 <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">3. Additional Context (Optional)</h2>
                             </div>
                             <p className="text-xs text-slate-500 mb-2">Include extra certifications, cover letter notes, or updated skills that aren't in your main CV.</p>
                             <div className="relative">
                                 <textarea 
                                    className="w-full p-3 text-sm border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. I recently completed a React Native certification. Also, please emphasize my leadership experience..."
                                    value={additionalInfo}
                                    onChange={(e) => setAdditionalInfo(e.target.value)}
                                 />
                                 <div className="absolute bottom-3 right-3">
                                     <input 
                                        type="file" 
                                        ref={additionalFileRef}
                                        className="hidden" 
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleAdditionalFileUpload}
                                     />
                                     <button 
                                        onClick={() => additionalFileRef.current?.click()}
                                        disabled={isProcessingFile}
                                        className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                                     >
                                        {isProcessingFile ? (
                                            <span>Processing...</span>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                Attach File
                                            </>
                                        )}
                                     </button>
                                 </div>
                             </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-200">
                        {cvInputMode !== 'skeleton' && targetMode !== 'title' && (
                            <Button variant="secondary" onClick={handleScanAndAnalyze} isLoading={status === Status.SCANNING || status === Status.ANALYZING} disabled={status === Status.GENERATING || !validateInputs()} className="flex-1">
                                Step 1: Analyze Match
                            </Button>
                        )}
                        
                        {cvInputMode === 'skeleton' ? (
                            <Button onClick={() => handleGenerateSkeleton(false)} isLoading={status === Status.GENERATING} disabled={!validateInputs()} className="flex-1 shadow-lg shadow-purple-200 bg-purple-600 hover:bg-purple-700">
                                Generate Skeleton CV
                            </Button>
                        ) : (
                            <Button onClick={() => handleGenerate(false, targetMode === 'title')} isLoading={status === Status.GENERATING} disabled={!validateInputs()} className="flex-1 shadow-lg shadow-indigo-200">
                                {targetMode === 'title' ? 'Generate Standard CV' : 'Step 2: Generate Tailored CV'}
                            </Button>
                        )}
                    </div>

                    {cvInputMode !== 'skeleton' && <AnalysisDashboard />}
                    
                    {!isPaidUser && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-center">
                            <AdBanner variant="display" />
                            <ProPlusFeatureCard onUpgrade={triggerPayment} />
                        </div>
                    )}
            </div>

            <AdDecisionModal 
                isOpen={showAdDecisionModal}
                onClose={() => setShowAdDecisionModal(false)}
                onWatchAd={handleAdDecisionWatch}
                onUpgrade={handleAdDecisionUpgrade}
            />

            <RewardedAdModal isOpen={showRewardedModal} onClose={() => setShowRewardedModal(false)} onComplete={handleAdComplete} />
            <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} onConfirmSupport={() => { setShowSupportModal(false); triggerPayment(); }} onContinueFree={() => { setShowSupportModal(false); setAdContext('download'); setShowRewardedModal(true); }} />
            <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} onLoadApplication={handleLoadHistory} />
            <LimitReachedModal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                onWatchAd={() => {}} // Disabled for hard limit
                onUpgrade={handleLimitUpgrade} 
                isMaxPlan={isMaxPlan} 
                isPaidUser={isPaidUser}
                eligibleForDiscount={discountEligible}
                limit={dailyLimit}
            />
            
            <FeatureLockedModal
                isOpen={showSkeletonLockModal}
                onClose={() => setShowSkeletonLockModal(false)}
                onUpgrade={() => { setShowSkeletonLockModal(false); triggerPayment('tier_2'); }} // Trigger Growth Plan
                title="Unlock Skeleton Mode"
                description="Skeleton Mode generates a perfect CV structure for your target job with placeholders for you to fill in. Upgrade to the Growth Plan (R39.99) or higher to access this feature."
            />

            {showRemoveCvModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative border border-slate-200">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Remove Saved CV?</h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            This will delete the CV text stored in your profile. You will need to upload your file again for your next application.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowRemoveCvModal(false)}
                                className="flex-1 py-2.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmRemoveCv}
                                className="flex-1 py-2.5 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-colors text-sm"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
};
