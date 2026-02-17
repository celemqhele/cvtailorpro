
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useOutletContext, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { smartEditCV, smartEditCoverLetter } from '../services/geminiService';
import { SavedApplication, CVData } from '../types';
import CVTemplate from '../components/CVTemplate';
import CoverLetterTemplate from '../components/CoverLetterTemplate';
import { SmartEditor } from '../components/SmartEditor';
import { FeatureLockedModal } from '../components/FeatureLockedModal';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { createWordBlob } from '../utils/docHelper';
import { generatePdfFromApi } from '../utils/pdfHelper';
import saveAs from 'file-saver';
import { GEMINI_KEY_1 } from '../constants';

export const GeneratedCV: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, triggerAuth, triggerPayment, isPaidUser, showToast } = useOutletContext<any>();
  
  const [application, setApplication] = useState<SavedApplication | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cv' | 'cl'>('cv');
  
  // Smart Edit State
  const [isSmartEditing, setIsSmartEditing] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  
  // Download State
  const [activeMenu, setActiveMenu] = useState<'cv' | 'cl' | null>(null);
  const [processingType, setProcessingType] = useState<string | null>(null); // e.g., 'cv-pdf', 'cl-docx'
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Subscription Popup State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
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

  useEffect(() => {
    if (!id) {
        navigate('/dashboard');
        return;
    }
    loadApplication(id);
  }, [id, navigate]);

  // Check for Subscription Trigger from Dashboard
  useEffect(() => {
      if (location.state?.showSubscribe) {
          const timer = setTimeout(() => {
              setShowSubscriptionModal(true);
          }, 2500); // 2.5s delay
          return () => clearTimeout(timer);
      }
  }, [location.state]);

  const loadApplication = async (appId: string) => {
    try {
        const app = await authService.getApplicationById(appId);
        if (!app) {
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
    } finally {
        setIsLoading(false);
    }
  };

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
             const updatedData = await smartEditCV(cvData, instruction, GEMINI_KEY_1);
             setCvData(updatedData);
             const updatedCvContent = JSON.stringify(updatedData);
             setApplication(prev => prev ? ({ ...prev, cv_content: updatedCvContent }) : null);
             await authService.updateApplication(application.id, updatedCvContent, application.cl_content);
          } else {
             // Cover Letter Mode
             if (!application.cl_content) return;
             const updatedCL = await smartEditCoverLetter(application.cl_content, instruction, GEMINI_KEY_1);
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

  const handleDownload = async (docType: 'cv' | 'cl', format: 'pdf' | 'docx') => {
      if (!application || !cvData) return;
      
      const processId = `${docType}-${format}`;
      setProcessingType(processId);
      setActiveMenu(null); // Close menu immediately

      try {
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
          if (element && element.children.length > 0) {
              const contentContainer = element.children[0];
              if (contentContainer.classList.contains('cv-preview-background')) {
                  contentContainer.classList.remove('cv-preview-background');
                  removedClass = true;
              }
          }

          let blob: Blob | null = null;

          if (format === 'docx') {
              blob = await createWordBlob(elementId);
          } else {
              // Try CloudConvert
              blob = await generatePdfFromApi(elementId);
          }

          // Restore class
          if (removedClass && element && element.children.length > 0) {
              element.children[0].classList.add('cv-preview-background');
          }

          if (blob) {
              saveAs(blob, fileName);
          } else if (format === 'pdf') {
              // Only alert if PDF failed, since DOCX is handled by local library
              showToast("PDF Generation service is currently unavailable. Please try again later.", 'error');
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
                       Back
                   </Link>
                   <div className="h-6 w-px bg-slate-200"></div>
                   <div>
                       <h1 className="text-lg font-bold text-slate-900 leading-none line-clamp-1">{application.job_title}</h1>
                       <p className="text-xs text-slate-500">{application.company_name} • {new Date(application.created_at).toLocaleDateString()}</p>
                   </div>
               </div>

               {/* Buttons Group */}
               <div className="flex items-center gap-3" ref={menuRef}>
                   
                   {application.original_link && (
                        <a 
                            href={application.original_link}
                            target="_blank"
                            rel="noopener noreferrer"
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
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                         disabled={!!processingType}
                       >
                            {processingType?.startsWith('cv') ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            Download CV
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
       <div className="max-w-[1400px] mx-auto px-4 py-8 print-container grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
           
           {/* LEFT: Main Preview Area */}
           <div className="order-2 lg:order-1">
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
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-3 h-px bg-slate-300"></span>
                        Gray lines indicate page breaks
                        <span className="w-3 h-px bg-slate-300"></span>
                    </div>
                </div>

                {/* Preview Wrapper */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[1100px] border border-slate-200 preview-wrapper">
                    <div className="overflow-x-auto bg-slate-100/50 p-8 md:p-12 flex justify-center preview-wrapper">
                        {viewMode === 'cv' ? (
                            <div id="cv-render-target" className="bg-white shadow-2xl origin-top scale-90 md:scale-100 transition-transform duration-200">
                                <CVTemplate data={cvData} />
                            </div>
                        ) : (
                            <div id="cl-render-target" className="bg-white shadow-2xl origin-top scale-90 md:scale-100 transition-transform duration-200">
                                {application.cl_content ? (
                                    <CoverLetterTemplate content={application.cl_content} userData={cvData} />
                                ) : (
                                    <div className="w-[816px] h-[1056px] flex items-center justify-center text-slate-400">
                                        No Cover Letter generated for this application.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
           </div>

           {/* RIGHT: Smart Editor Sidebar */}
           <div className="order-1 lg:order-2 sidebar-container lg:h-full no-print">
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

       {/* Subscription Modal (New) */}
       <SubscriptionModal 
          isOpen={showSubscriptionModal} 
          onClose={() => setShowSubscriptionModal(false)} 
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
    </div>
  );
};
