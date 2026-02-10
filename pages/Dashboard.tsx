
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { useOutletContext, useNavigate, useLocation, Link } from 'react-router-dom';

import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { AdBanner } from '../components/AdBanner';
import { RewardedAdModal } from '../components/RewardedAdModal';
import { SupportModal } from '../components/SupportModal';
import { HistoryModal } from '../components/HistoryModal';
import { LimitReachedModal } from '../components/LimitReachedModal';
import CVTemplate from '../components/CVTemplate'; 
import CoverLetterTemplate from '../components/CoverLetterTemplate';
import { ProPlusFeatureCard } from '../components/ProPlusFeatureCard';

import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch } from '../services/geminiService';
import { authService } from '../services/authService';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { FileData, GeneratorResponse, Status, MatchAnalysis, SavedApplication, ManualCVData, ManualExperienceItem, ManualEducationItem } from '../types';
import { GEMINI_KEY_1 } from '../constants';
import { createWordBlob } from '../utils/docHelper';
import { generatePdfFromApi } from '../utils/pdfHelper';

interface DashboardProps {
    mode: 'user' | 'guest';
}

export const Dashboard: React.FC<DashboardProps> = ({ mode }) => {
  // Context from Layout
  const { 
      user, 
      dailyLimit, 
      isPaidUser, 
      isMaxPlan, 
      setDailyCvCount, 
      triggerAuth, 
      triggerPayment 
  } = useOutletContext<any>();

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect Logic
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
  
  // Input Modes
  const [cvInputMode, setCvInputMode] = useState<'upload' | 'scratch'>('upload');
  const [file, setFile] = useState<FileData | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // --- Manual Form State ---
  const [manualData, setManualData] = useState<ManualCVData>({
    fullName: '', email: '', phone: '', location: '', summary: '', experience: [], education: [], skills: []
  });

  // Temp State
  const [tempExp, setTempExp] = useState<ManualExperienceItem>({ id: '', title: '', company: '', startDate: '', endDate: '', description: '' });
  const [tempEdu, setTempEdu] = useState<ManualEducationItem>({ id: '', degree: '', school: '', year: '' });
  const [tempSkill, setTempSkill] = useState('');

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
  const [pendingLimitAction, setPendingLimitAction] = useState<(() => void) | null>(null);
  const [adContext, setAdContext] = useState<'download' | 'limit_reward'>('download');
  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  const [isZipping, setIsZipping] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

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
    if (user && result && !generatedCvId && status === Status.SUCCESS) {
        saveCurrentResultToHistory();
    }
  }, [user, result, generatedCvId, status]);

  useEffect(() => {
    if (status === Status.SUCCESS && result && previewRef.current) {
        setTimeout(() => {
            previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
  }, [status, result]);

  // --- Handlers ---
  const handleLimitAdWatch = () => {
      setShowLimitModal(false);
      setAdContext('limit_reward');
      setShowRewardedModal(true);
  };

  const handleLimitUpgrade = () => {
      setShowLimitModal(false);
      triggerPayment();
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

  const validateInputs = () => {
      if (cvInputMode === 'upload' && !file) return false;
      if (cvInputMode === 'scratch') {
          if (!manualData.fullName) return false;
          if (manualData.experience.length === 0) return false;
      }
      if (targetMode === 'url' && !jobLink) return false;
      if (targetMode === 'text' && !manualJobText.trim()) return false;
      if (targetMode === 'title' && !jobTitle.trim()) return false;
      return true;
  };

  const handleScanAndAnalyze = async () => {
      if (!validateInputs()) return;
      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');
      setGeneratedCvId(null);
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
          if (!textToAnalyze || textToAnalyze.length < 20) throw new Error("Job description is too short.");
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
        const savedApp = await authService.saveApplication(
            role, company, JSON.stringify(result.cvData), result.coverLetter?.content || '', analysis?.matchScore || 0
        );
        if (savedApp) {
            setGeneratedCvId(savedApp.id);
        }
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
    setGeneratedCvId(null);
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
             setDailyCvCount((prev: number) => prev + 1);
          }
          if (user) await saveCurrentResultToHistory();
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
      // Intentionally empty or used to redirect if needed, but current usage in Dashboard is mostly just viewing
      // Logic moved to HistoryModal to navigate to dedicated page
  };

  const initiateDownloadBundle = () => {
      if (isPaidUser) {
          executeZipDownload();
          return;
      }
      setShowSupportModal(true);
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
                                     <button onClick={() => setCvInputMode('upload')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'upload' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Upload</button>
                                     <button onClick={() => setCvInputMode('scratch')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cvInputMode === 'scratch' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Fill Form</button>
                                 </div>
                             </div>

                             {cvInputMode === 'upload' ? (
                                 <FileUpload onFileSelect={setFile} selectedFileName={file?.name} />
                             ) : (
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
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LinkedIn URL (Optional)</label>
                                 <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm outline-none" placeholder="https://linkedin.com/in/username" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}/>
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
                    
                    {!isPaidUser && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 items-center">
                            <AdBanner variant="display" />
                            <ProPlusFeatureCard onUpgrade={triggerPayment} />
                        </div>
                    )}

                    {result && status === Status.SUCCESS && (
                        <div ref={previewRef} className="animate-fade-in mt-12">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Your Application Package</h2>
                                <div className="flex gap-2">
                                    {generatedCvId && (
                                        <Link 
                                            to={`/cv-generated/${generatedCvId}`}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            Open Permanent Link
                                        </Link>
                                    )}
                                    <div className="flex bg-slate-200 p-1 rounded-lg">
                                        <button onClick={() => setPreviewTab('cv')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${previewTab === 'cv' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>CV Preview</button>
                                        <button onClick={() => setPreviewTab('cl')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${previewTab === 'cl' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Cover Letter</button>
                                    </div>
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
                                    <div className="overflow-x-auto bg-slate-100 p-8 flex justify-center">
                                        <div id="cl-preview-content" className="bg-white shadow-lg origin-top scale-90 md:scale-100">
                                             {/* Using the new template instead of ReactMarkdown */}
                                             <CoverLetterTemplate content={result.coverLetter?.content || ''} userData={result.cvData!} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-4 z-30 mt-6 mx-auto max-w-lg">
                                <div className="bg-slate-900 text-white p-2 pl-6 rounded-full shadow-2xl flex items-center justify-between gap-4">
                                    <span className="font-bold text-sm hidden sm:block">Ready to apply?</span>
                                    <div className="flex items-center gap-2">
                                        {directApplyLink && (
                                            <a 
                                                href={directApplyLink} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="bg-white text-slate-900 px-4 py-3 rounded-full font-bold transition-all hover:bg-slate-100 text-sm whitespace-nowrap"
                                            >
                                                Go to Application
                                            </a>
                                        )}
                                        <button onClick={initiateDownloadBundle} disabled={isZipping} className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95 text-sm whitespace-nowrap">
                                            {isZipping ? 'Preparing...' : 'Download'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
                 {result?.cvData && <div id="hidden-cv-content" style={{ width: '816px', backgroundColor: 'white' }}><CVTemplate data={result.cvData} /></div>}
                 {/* Updated hidden container to use CoverLetterTemplate for consistent PDF generation */}
                 {result?.coverLetter?.content && <div id="hidden-cl-content" style={{ width: '816px', backgroundColor: 'white' }}><CoverLetterTemplate content={result.coverLetter.content} userData={result.cvData!} /></div>}
            </div>

            <RewardedAdModal isOpen={showRewardedModal} onClose={() => setShowRewardedModal(false)} onComplete={handleAdComplete} />
            <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} onConfirmSupport={() => { setShowSupportModal(false); triggerPayment(); }} onContinueFree={() => { setShowSupportModal(false); setAdContext('download'); setShowRewardedModal(true); }} />
            <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} onLoadApplication={handleLoadHistory} />
            <LimitReachedModal 
                isOpen={showLimitModal} 
                onClose={() => setShowLimitModal(false)} 
                onWatchAd={handleLimitAdWatch} 
                onUpgrade={handleLimitUpgrade} 
                isMaxPlan={isMaxPlan} 
                isPaidUser={isPaidUser}
            />
    </div>
  );
};
