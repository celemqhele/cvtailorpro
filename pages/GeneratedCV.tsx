import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useOutletContext, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { smartEditCV, smartEditCoverLetter } from '../services/geminiService';
import { SavedApplication, CVData } from '../types';
import { PLANS } from '../services/subscriptionService';
import CVTemplate from '../components/CVTemplate';
import CoverLetterTemplate from '../components/CoverLetterTemplate';
import { SmartEditor } from '../components/SmartEditor';
import { FeatureLockedModal } from '../components/FeatureLockedModal';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { LeadCaptureModal } from '../components/LeadCaptureModal';
import { createWordBlob } from '../utils/docHelper';
import { generatePdfFromApi } from '../utils/pdfHelper';
import { analytics } from '../services/analyticsService';
import { supabase } from '../services/supabaseClient';
import { checkUsageLimit, incrementUsage } from '../services/usageService';
import { LimitReachedModal } from '../components/LimitReachedModal';
import saveAs from 'file-saver';

import { ConfirmModal } from '../components/ConfirmModal';

export const GeneratedCV: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, triggerAuth, triggerPayment, isPaidUser, showToast, dailyCvCount, dailyLimit, isMaxPlan, checkUserSession } = useOutletContext<any>();
  const hasFreeCredits = isMaxPlan || dailyCvCount < dailyLimit;
  
  const currentPlan = user?.plan_id ? PLANS.find((p: any) => p.id === user.plan_id) : PLANS[0];
  const hasMasterEditorAccess = (currentPlan as any)?.hasMasterEditor;
  const hasPdfAccess = (currentPlan as any)?.hasPdfDownload;

  const [application, setApplication] = useState<SavedApplication | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cv' | 'cl' | 'strategy'>('cv');
  
  // Master Editor State
  const [isMasterEditMode, setIsMasterEditMode] = useState(false);
  
  // Smart Edit State
  const [isSmartEditing, setIsSmartEditing] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showPdfLockedModal, setShowPdfLockedModal] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  
  // Download State
  const [activeMenu, setActiveMenu] = useState<'cv' | 'cl' | null>(null);
  const [processingType, setProcessingType] = useState<string | null>(null); // e.g., 'cv-pdf', 'cl-docx'
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Subscription Popup State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ docType: 'cv' | 'cl', format: 'pdf' | 'docx' } | null>(null);
  const [confirmDocxDownload, setConfirmDocxDownload] = useState<{ docType: 'cv' | 'cl' } | null>(null);

  const handleLimitUpgrade = () => {
      setShowLimitModal(false);
      triggerPayment();
  };
  
  // Click outside to close menus
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadApplication = React.useCallback(async (appId: string) => {
    // 1. Immediate Fallback: If we have data in state, use it to show content faster
    if (location.state?.cvData) {
        setCvData(location.state.cvData);
        // We'll still try to load the full application from DB for editing/claiming
    }

    try {
        const app = await authService.getApplicationById(appId);
        if (!app) {
            // 2. Secondary Fallback: If DB fetch fails but we have state, synthesize an application
            if (location.state?.cvData) {
                const tempApp: SavedApplication = {
                    id: appId,
                    user_id: null,
                    job_title: location.state.jobTitle || "Job Application",
                    company_name: location.state.companyName || "Company",
                    cv_content: JSON.stringify(location.state.cvData),
                    cl_content: "",
                    match_score: 100,
                    created_at: new Date().toISOString(),
                    original_link: location.state.originalLink
                };
                setApplication(tempApp);
                setIsLoading(false);
                return;
            }
            throw new Error("Application not found");
        }
        
        setApplication(app);
        
        try {
            const parsed = JSON.parse(app.cv_content);
            setCvData(parsed);
        } catch (e) {
            console.error("Failed to parse CV content");
        }
    } catch (e) {
        console.error(e);
        // Final Fallback: If error occurred but we have state
        if (location.state?.cvData) {
            const tempApp: SavedApplication = {
                id: appId,
                user_id: null,
                job_title: location.state.jobTitle || "Job Application",
                company_name: location.state.companyName || "Company",
                cv_content: JSON.stringify(location.state.cvData),
                cl_content: "",
                match_score: 100,
                created_at: new Date().toISOString(),
                original_link: location.state.originalLink
            };
            setApplication(tempApp);
        }
    } finally {
        setIsLoading(false);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (!id) {
        navigate('/dashboard');
        return;
    }
    loadApplication(id);
    analytics.trackEvent('document_preview');
  }, [id, navigate, loadApplication]);

  // Check for Subscription Trigger from Dashboard
  useEffect(() => {
      if (location.state?.showSubscribe) {
          const timer = setTimeout(() => {
              setShowSubscriptionModal(true);
          }, 2500); // 2.5s delay
          return () => clearTimeout(timer);
      }
  }, [location.state]);

  const handleClaim = async () => {
      if (!id || !user) return;
      setIsClaiming(true);
      try {
          const success = await authService.claimApplication(id);
          if (success) {
              loadApplication(id);
              showToast("Application successfully saved to your profile!", 'success');
          } else {
              showToast("Failed to save application.", 'error');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsClaiming(false);
      }
  };

  const handleSmartEdit = async (instruction: string) => {
      if (!application) return;
      setIsSmartEditing(true);
      
      try {
          if (viewMode === 'cv') {
             if (!cvData) return;
             const updatedData = await smartEditCV(cvData, instruction, "", user?.plan_id);
             setCvData(updatedData);
             const updatedCvContent = JSON.stringify(updatedData);
             setApplication(prev => prev ? ({ ...prev, cv_content: updatedCvContent }) : null);
             await authService.updateApplication(application.id, updatedCvContent, application.cl_content);
          } else {
             // Cover Letter Mode
             if (!application.cl_content) return;
             const updatedCL = await smartEditCoverLetter(application.cl_content, instruction, "", user?.plan_id);
             setApplication(prev => prev ? ({ ...prev, cl_content: updatedCL }) : null);
             await authService.updateApplication(application.id, application.cv_content, updatedCL);
          }
          
          setShowEditSuccess(true);
          setTimeout(() => setShowEditSuccess(false), 3000);
      } catch (e) {
          console.error("Smart Edit failed", e);
          showToast("Failed to apply edits. Please try again.", 'error');
      } finally {
          setIsSmartEditing(false);
      }
  };

  const handleManualUpdate = async (updatedData: CVData) => {
      if (!application) return;
      setIsSmartEditing(true);
      try {
          setCvData(updatedData);
          const updatedCvContent = JSON.stringify(updatedData);
          setApplication(prev => prev ? ({ ...prev, cv_content: updatedCvContent }) : null);
          
          await authService.updateApplication(application.id, updatedCvContent, application.cl_content);
          
          setShowEditSuccess(true);
          setTimeout(() => setShowEditSuccess(false), 3000);
      } catch (e) {
          console.error("Manual update failed", e);
      } finally {
          setIsSmartEditing(false);
      }
  };

  const handleManualUpdateCL = async (updatedContent: string) => {
      if (!application) return;
      setIsSmartEditing(true);
      try {
          setApplication(prev => prev ? ({ ...prev, cl_content: updatedContent }) : null);
          await authService.updateApplication(application.id, application.cv_content, updatedContent);
          
          setShowEditSuccess(true);
          setTimeout(() => setShowEditSuccess(false), 3000);
      } catch (e) {
          console.error("Manual CL update failed", e);
      } finally {
          setIsSmartEditing(false);
      }
  };

  const handleDownload = async (docType: 'cv' | 'cl', format: 'pdf' | 'docx', bypassAd: boolean = false) => {
      if (!application || !cvData) return;
      
      const isAdmin = user?.email === 'mqhele03@gmail.com';
      const canProceed = await checkUsageLimit(user?.id, dailyLimit, user?.plan_id);
      
      if (!canProceed && !isAdmin) {
          setShowLimitModal(true);
          return;
      }

      // Check PDF Access
      if (format === 'pdf' && !hasPdfAccess) {
          setShowPdfLockedModal(true);
          return;
      }

      // Lead Capture for Free Users on Download (Paid users skip this)
      if (!isPaidUser && !bypassAd) {
          setPendingDownload({ docType, format });
          
          // Check if lead capture is needed first
          let hasCapturedLead = false;
          
          if (user) {
              // Logged in user: check profile flag (lifetime of account)
              hasCapturedLead = !!user.opt_in_headhunter;
          } else {
              // Guest user: check session storage (once per session)
              hasCapturedLead = !!localStorage.getItem(`lead_captured_${analytics.getToken()}`);
          }

          if (!hasCapturedLead) {
              setShowLeadModal(true);
              return;
          }
          // If lead is captured and no ads, just proceed
      }

      const processId = `${docType}-${format}`;
      setProcessingType(processId);
      setActiveMenu(null); // Close menu immediately

      try {
          // Track download event
          analytics.trackEvent('cv_downloaded', { 
            docType, 
            format, 
            job_title: application.job_title,
            company_name: application.company_name
          });
          const baseName = `${cvData.name} - ${application.job_title}`;
          const suffix = docType === 'cv' ? 'CV' : 'Cover Letter';
          const fileName = `${baseName} - ${suffix}.${format}`;
          
          const elementId = docType === 'cv' ? 'cv-render-target' : 'cl-render-target';
          
          // Switch view if needed to ensure element exists in DOM
          if (viewMode !== docType) {
              setViewMode(docType);
              // Wait for render
              await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Temporarily remove the preview lines from the DOM element to ensure clean export
          const element = document.getElementById(elementId);
          let removedClass = false;
          if (element) {
              // Ensure we target the right container
              const container = element.classList.contains('cv-absolute-container') ? element : element.querySelector('.cv-absolute-container');
              if (container && container.classList.contains('cv-preview-background')) {
                  container.classList.remove('cv-preview-background');
                  removedClass = true;
              }
          }

          let blob: Blob | null = null;

          if (format === 'docx') {
              blob = await createWordBlob(elementId);
          } else {
              try {
                  showToast("Generating high-quality PDF...", 'info');
                  blob = await generatePdfFromApi(elementId);
              } catch (apiError) {
                  console.error("API PDF generation failed:", apiError);
              }
          }

          // Restore class
          if (removedClass && element && element.children.length > 0) {
              element.children[0].classList.add('cv-preview-background');
          }

          if (blob) {
              saveAs(blob, fileName);
              if (!isAdmin) {
                  await incrementUsage(user?.id);
              }
          } else if (format === 'pdf') {
              // PDF failed, prompt for DOCX
              setConfirmDocxDownload({ docType });
          } else {
              showToast("Failed to generate file.", 'error');
          }
      } catch (e) {
          console.error("Download error:", e);
          showToast("An error occurred during download.", 'error');
      } finally {
          setProcessingType(null);
      }
  };

  const handleLeadSubmit = async (email: string, jobType: string, seniority: string) => {
      try {
          // 1. Save to Supabase
          await supabase.from('leads').insert({
              email,
              user_id: user?.id || null,
              source: 'cv_download',
              job_type: jobType,
              seniority: seniority,
              metadata: {
                  job_title: application?.job_title,
                  company_name: application?.company_name,
                  session_token: analytics.getToken()
              }
          });
          
          // 2. Add to HubSpot
          await fetch('/api/hubspot-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, jobType, seniority })
          }).catch(err => console.error('HubSpot sync failed:', err));
          
          analytics.trackEvent('lead_captured', { email, jobType, seniority });
          
          if (user) {
              // Logged in: update profile for lifetime tracking
              await authService.updateHeadhunterOptIn(true);
              // Refresh session to update local user object
              checkUserSession();
          } else {
              // Guest: update session storage
              localStorage.setItem(`lead_captured_${analytics.getToken()}`, 'true');
          }
          
          if (pendingDownload) {
              // After lead capture, proceed to download
              handleDownload(pendingDownload.docType, pendingDownload.format, true);
              setPendingDownload(null);
          }
      } catch (err) {
          console.error('Failed to save lead:', err);
          throw err;
      }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  if (!application || !cvData) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Application Not Found</h1>
              <p className="text-slate-600 mb-6">This CV might have been deleted or does not exist.</p>
              <Link to="/dashboard" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Dashboard</Link>
          </div>
      );
  }

  const isGuestApplication = !application.user_id;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
        <style>
            {`
            @media print {
                body > *:not(#root) { display: none !important; }
                /* Hide everything in root except the generated CV page content */
                #root > div > *:not(.print-container) { display: none !important; }
                
                /* Target the main container in GeneratedCV */
                .print-container { 
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: 100%; 
                    margin: 0; 
                    padding: 0;
                    background: white;
                }
                
                /* Ensure Render Target is visible and reset styles */
                #cv-render-target, #cl-render-target {
                    transform: none !important;
                    box-shadow: none !important;
                    margin: 0 auto !important;
                    width: 100% !important;
                    max-width: 816px !important;
                }
                
                /* Hide the preview container background styling */
                .preview-wrapper {
                    padding: 0 !important;
                    background: white !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            }
            `}
        </style>

       {/* Guest Expiration Banner */}
       {isGuestApplication && (
           <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-4 py-3 text-center text-sm font-medium no-print">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
                    <span className="flex items-center gap-2">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         This link will expire in 48 hours.
                    </span>
                    {user ? (
                        <button 
                            onClick={handleClaim} 
                            disabled={isClaiming}
                            className="text-indigo-700 hover:text-indigo-900 underline font-bold"
                        >
                            {isClaiming ? "Saving..." : "Save to my Profile"}
                        </button>
                    ) : (
                        <button 
                            onClick={() => triggerAuth()} 
                            className="text-indigo-700 hover:text-indigo-900 underline font-bold"
                        >
                            Log in to Save permanently
                        </button>
                    )}
                </div>
           </div>
       )}

       {/* Top Bar */}
       <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
           <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
               <div className="flex items-center gap-4">
                   <Link to={user ? "/dashboard" : "/guestuserdashboard"} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       <span className="hidden sm:inline">Back</span>
                   </Link>
                   <div className="h-6 w-px bg-slate-200"></div>
                   <div>
                       <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-none truncate">{application.job_title}</h1>
                       <p className="text-[10px] sm:text-xs text-slate-500 truncate">{application.company_name}</p>
                   </div>
               </div>

               {/* Buttons Group */}
               <div className="flex items-center gap-3" ref={menuRef}>
                   
                   {application.original_link && (
                        <a 
                            href={application.original_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => analytics.trackEvent('continue_to_app_clicked', { job_title: application.job_title })}
                            className="hidden md:flex px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm items-center gap-2 transition-all"
                        >
                            Continue to Application
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                   )}

                   {/* CV Download Button */}
                   <div className="relative">
                       <button 
                         onClick={() => setActiveMenu(activeMenu === 'cv' ? null : 'cv')}
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all group"
                         disabled={!!processingType}
                       >
                            {processingType?.startsWith('cv') ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            <span className="hidden sm:inline">Download {hasFreeCredits ? 'Free' : ''} CV</span>
                            <span className="sm:hidden">CV</span>
                            <svg className={`w-3 h-3 transition-transform ${activeMenu === 'cv' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                       </button>

                       {activeMenu === 'cv' && (
                           <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-fade-in">
                               <button 
                                 onClick={() => handleDownload('cv', 'pdf')}
                                 className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                               >
                                   <span className="bg-red-100 text-red-600 p-1 rounded text-xs font-bold w-12 text-center">PDF</span>
                                   Adobe PDF
                               </button>
                               <button 
                                 onClick={() => handleDownload('cv', 'docx')}
                                 className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                               >
                                   <span className="bg-blue-100 text-blue-600 p-1 rounded text-xs font-bold w-12 text-center">DOCX</span>
                                   MS Word
                               </button>
                           </div>
                       )}
                   </div>

                   {/* Master Editor Toggle */}
                   {hasMasterEditorAccess && (
                        <button 
                            onClick={() => setIsMasterEditMode(!isMasterEditMode)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${isMasterEditMode ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            {isMasterEditMode ? 'Exit Master Editor' : 'Master Editor'}
                        </button>
                    )}

                   {/* Cover Letter Download Button */}
                   {application.cl_content && (
                       <div className="relative">
                           <button 
                             onClick={() => setActiveMenu(activeMenu === 'cl' ? null : 'cl')}
                             className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                             disabled={!!processingType}
                           >
                                {processingType?.startsWith('cl') ? (
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                                )}
                                Cover Letter
                                <svg className={`w-3 h-3 transition-transform ${activeMenu === 'cl' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                           </button>

                           {activeMenu === 'cl' && (
                               <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-fade-in">
                                   <button 
                                     onClick={() => handleDownload('cl', 'pdf')}
                                     className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                   >
                                       <span className="bg-red-100 text-red-600 p-1 rounded text-xs font-bold w-12 text-center">PDF</span>
                                       Adobe PDF
                                   </button>
                                   <button 
                                     onClick={() => handleDownload('cl', 'docx')}
                                     className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                   >
                                       <span className="bg-blue-100 text-blue-600 p-1 rounded text-xs font-bold w-12 text-center">DOCX</span>
                                       MS Word
                                   </button>
                               </div>
                           )}
                       </div>
                   )}

               </div>
           </div>
       </div>

       {/* Success Toast */}
       {showEditSuccess && (
         <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce-subtle no-print">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           <span className="font-bold">Changes Applied Successfully!</span>
         </div>
       )}

       {/* Layout with Sidebar */}
       <div className="max-w-[1400px] mx-auto px-4 py-8 print-container grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-8 items-start">
           
           {/* LEFT: Meta Sidebar */}
           <div className="order-2 lg:order-1 space-y-6 no-print">
                {/* Recruiter Headhunter Opt-in */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Headhunter</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Talent Network</p>
                        </div>
                    </div>
                    
                    {user?.opt_in_headhunter ? (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Profile Active
                            </div>
                            <p className="text-[11px] text-green-600 leading-tight">Recruiters can now find and contact you for relevant roles.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                                Allow recruiters to find your profile and contact you directly for relevant job opportunities.
                            </p>
                            <button 
                                onClick={async () => {
                                    try {
                                        if (!user) {
                                            triggerAuth();
                                            return;
                                        }
                                        await supabase.from('profiles').update({ opt_in_headhunter: true }).eq('id', user.id);
                                        analytics.trackEvent('headhunter_opt_in', { user_id: user.id });
                                        await checkUserSession();
                                        showToast("You've successfully opted in! Recruiters can now find you.", 'success');
                                    } catch (err) {
                                        console.error('Opt-in failed:', err);
                                        showToast("Failed to opt in. Please try again.", 'error');
                                    }
                                }}
                                className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                            >
                                Opt-in to Headhunter
                            </button>
                        </>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="bg-indigo-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-indigo-700 mb-1">Pro Tip</h4>
                            <p className="text-[11px] text-indigo-600 leading-relaxed">
                                Tailored CVs have a 3x higher response rate. Use the Smart Editor to tweak your summary.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CENTER: Main Preview Area */}
            <div className="order-3 lg:order-2">
                {/* Mobile Apply Button */}
                {application.original_link && (
                    <div className="md:hidden mb-6 no-print">
                            <a 
                                href={application.original_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-base font-bold rounded-xl shadow-md items-center gap-2 transition-all"
                            >
                                Continue to Application
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                    </div>
                )}
                
                {/* Controls */}
                <div className="flex justify-between items-center mb-8 no-print">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                        <button 
                            onClick={() => setViewMode('cv')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'cv' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Curriculum Vitae
                        </button>
                        <button 
                            onClick={() => setViewMode('cl')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'cl' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Cover Letter
                        </button>
                        {application?.metadata?.rationale && (
                            <button 
                                onClick={() => setViewMode('strategy')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'strategy' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Strategic Rationale
                            </button>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        {/* Legend removed */}
                    </div>
                </div>

                {/* Preview Wrapper */}
                <div className={`bg-white rounded-2xl shadow-xl overflow-hidden min-h-[1100px] border border-slate-200 preview-wrapper ${isMasterEditMode ? 'ring-4 ring-emerald-500/20' : ''}`}>
                    {isMasterEditMode && (
                        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-center">
                            <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                MASTER EDITOR ACTIVE: Click any text to edit directly. Changes save automatically on blur.
                            </p>
                        </div>
                    )}
                    <div className="overflow-x-auto bg-slate-100/50 p-4 md:p-12 flex justify-start md:justify-center preview-wrapper">
                        {viewMode === 'cv' ? (
                            <div id="cv-render-target" className="bg-white shadow-2xl origin-top-left md:origin-top scale-[0.85] md:scale-100 transition-transform duration-200 shrink-0 mb-[-150px] md:mb-0">
                                <CVTemplate 
                                    data={cvData} 
                                    isEditable={isMasterEditMode} 
                                    onUpdate={handleManualUpdate}
                                />
                            </div>
                        ) : viewMode === 'cl' ? (
                            <div id="cl-render-target" className="bg-white shadow-2xl origin-top-left md:origin-top scale-[0.85] md:scale-100 transition-transform duration-200 shrink-0 mb-[-150px] md:mb-0">
                                {application.cl_content ? (
                                    <CoverLetterTemplate 
                                        content={application.cl_content} 
                                        userData={cvData} 
                                        isEditable={isMasterEditMode}
                                        onUpdate={handleManualUpdateCL}
                                    />
                                ) : (
                                    <div className="w-[816px] h-[1056px] flex items-center justify-center text-slate-400">
                                        No Cover Letter generated for this application.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 animate-fade-in">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Strategic Rationale</h2>
                                        <p className="text-slate-500">How our AI optimized your profile for this specific role</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Strategic Strength</h3>
                                            <p className="text-slate-700 leading-relaxed">{application.metadata.rationale.strength}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Alignment Edits</h3>
                                            <p className="text-slate-700 leading-relaxed">{application.metadata.rationale.alignment}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">ATS & Readability</h3>
                                            <p className="text-slate-700 leading-relaxed">{application.metadata.rationale.ats_readability}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Value Positioning</h3>
                                            <p className="text-slate-700 leading-relaxed">{application.metadata.rationale.value_positioning}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-sm text-indigo-800 italic">
                                        "This rationale explains the 'why' behind the edits. We've reframed your experience to highlight the outcomes most relevant to the employer's needs, ensuring you stand out both to ATS filters and human recruiters."
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
           </div>

            {/* RIGHT: Smart Editor Sidebar */}
            <div className="order-1 lg:order-3 sidebar-container lg:h-full no-print space-y-6">
                <SmartEditor 
                  cvData={cvData}
                  clContent={application.cl_content}
                  viewMode={viewMode}
                  onSmartEdit={handleSmartEdit}
                  onManualUpdate={handleManualUpdate}
                  onManualUpdateCL={handleManualUpdateCL}
                  isLocked={!isPaidUser}
                  onUnlock={() => setShowLockedModal(true)}
                  isProcessing={isSmartEditing}
                  userPlanId={user?.plan_id}
                  showToast={showToast}
                />
            </div>
       </div>

       {/* Locked Modal */}
       <FeatureLockedModal 
          isOpen={showLockedModal}
          onClose={() => setShowLockedModal(false)}
          onUpgrade={() => { setShowLockedModal(false); triggerPayment(); }}
          title="Unlock Smart Editing"
          description="Pro users can make unlimited AI tweaks and manual edits to their generated CVs. Upgrade now to perfect your application."
       />

       <FeatureLockedModal 
          isOpen={showPdfLockedModal}
          onClose={() => setShowPdfLockedModal(false)}
          onUpgrade={() => { setShowPdfLockedModal(false); triggerPayment(); }}
          title="Unlock PDF Downloads"
          description="High-quality PDF generation costs credits. Upgrade to a Growth or Pro plan to unlock professional PDF downloads for all your CVs."
       />

       {/* Subscription Modal (New) */}
       <SubscriptionModal 
          isOpen={showSubscriptionModal} 
          onClose={() => setShowSubscriptionModal(false)} 
       />

       <LeadCaptureModal 
          isOpen={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          onSubmit={handleLeadSubmit}
       />

       <LimitReachedModal 
           isOpen={showLimitModal} 
           onClose={() => setShowLimitModal(false)} 
           onUpgrade={handleLimitUpgrade} 
           isMaxPlan={isMaxPlan} 
           isPaidUser={isPaidUser}
           eligibleForDiscount={false}
           limit={dailyLimit}
       />

       {/* Rate Us Floating Button */}
       <a 
          href="https://g.page/r/CfP6fwaNpAbCEBE/review"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-6 bottom-24 z-40 bg-white border border-slate-200 shadow-xl rounded-full px-4 py-3 flex items-center gap-3 hover:scale-105 transition-transform group no-print"
       >
          <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Love the app?</p>
              <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">Rate us on Google</p>
          </div>
       </a>

      <ConfirmModal
        isOpen={!!confirmDocxDownload}
        title="PDF Unavailable"
        message="PDF Generation service is currently unavailable. Would you like to download the DOCX version instead?"
        confirmText="Download DOCX"
        cancelText="Cancel"
        onConfirm={() => {
            if (confirmDocxDownload) {
                handleDownload(confirmDocxDownload.docType, 'docx');
                setConfirmDocxDownload(null);
            }
        }}
        onCancel={() => setConfirmDocxDownload(null)}
      />
    </div>
  );
};
