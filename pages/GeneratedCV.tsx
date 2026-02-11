
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { authService } from '../services/authService';
import { SavedApplication, CVData } from '../types';
import CVTemplate from '../components/CVTemplate';
import CoverLetterTemplate from '../components/CoverLetterTemplate';
import { createWordBlob } from '../utils/docHelper';
import { generatePdfFromApi } from '../utils/pdfHelper';
import saveAs from 'file-saver';

export const GeneratedCV: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, triggerAuth } = useOutletContext<any>();
  
  const [application, setApplication] = useState<SavedApplication | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cv' | 'cl'>('cv');
  
  // Download State
  const [activeMenu, setActiveMenu] = useState<'cv' | 'cl' | null>(null);
  const [processingType, setProcessingType] = useState<string | null>(null); // e.g., 'cv-pdf', 'cl-docx'
  const [isClaiming, setIsClaiming] = useState(false);
  
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

  const loadApplication = async (appId: string) => {
    try {
        const app = await authService.getApplicationById(appId);
        if (!app) {
            throw new Error("Application not found");
        }
        
        // Auto-clean em dashes from cover letter if present
        if (app.cl_content) {
            app.cl_content = app.cl_content.replace(/—/g, ' - ');
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
              alert("Application successfully saved to your profile!");
          } else {
              alert("Failed to save application.");
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsClaiming(false);
      }
  };

  const handlePrint = () => {
      // 1. Ensure correct view is active
      if (activeMenu === 'cv' && viewMode !== 'cv') setViewMode('cv');
      if (activeMenu === 'cl' && viewMode !== 'cl') setViewMode('cl');
      
      // 2. Small delay to render then print
      setTimeout(() => {
          const printContent = document.getElementById(viewMode === 'cv' ? 'cv-render-target' : 'cl-render-target');
          if (!printContent) return;

          // Native print involves some CSS trickery usually, but since we have a dedicated page,
          // we can just use window.print() and let the @media print CSS hide the rest.
          // However, we need to ensure the element we want is marked for printing.
          
          // Temporary class addition for print styling if needed
          document.body.classList.add('printing');
          window.print();
          document.body.classList.remove('printing');
          setActiveMenu(null);
      }, 300);
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

          let blob: Blob | null = null;

          if (format === 'docx') {
              blob = await createWordBlob(elementId);
          } else {
              // Ensure print styles are active if needed or just capture element
              blob = await generatePdfFromApi(elementId);
          }

          if (blob) {
              saveAs(blob, fileName);
          } else {
              alert("Failed to generate file. Please try again or use the Print option.");
          }

      } catch (e) {
          console.error("Download error:", e);
          alert("An error occurred during download.");
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
                
                /* Hide navbar, controls, buttons */
                .no-print { display: none !important; }
                
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
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                   
                   {/* 0. Continue to Application Button */}
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

                   {/* 1. CV Download Button */}
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
                               <div className="border-t border-slate-100 my-1"></div>
                               <button 
                                 onClick={handlePrint}
                                 className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                               >
                                   <span className="bg-slate-100 text-slate-600 p-1 rounded text-xs font-bold w-12 text-center">PRINT</span>
                                   Print / Save PDF
                               </button>
                           </div>
                       )}
                   </div>

                   {/* 2. Cover Letter Download Button */}
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
                                   <div className="border-t border-slate-100 my-1"></div>
                                   <button 
                                     onClick={handlePrint}
                                     className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                   >
                                       <span className="bg-slate-100 text-slate-600 p-1 rounded text-xs font-bold w-12 text-center">PRINT</span>
                                       Print / Save PDF
                                   </button>
                               </div>
                           )}
                       </div>
                   )}

               </div>
           </div>
       </div>

       {/* Main Content */}
       <div className="max-w-5xl mx-auto px-4 py-8 print-container">
           
           {/* Mobile Apply Button (Visible only on small screens) */}
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
           <div className="flex justify-center mb-8 no-print">
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
           </div>

           {/* Preview Area */}
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

       {/* Rate Us Floating Button */}
       <a 
          href="https://g.page/r/CfP6fwaNpAbCEBE/review"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-6 bottom-6 z-40 bg-white border border-slate-200 shadow-xl rounded-full px-4 py-3 flex items-center gap-3 hover:scale-105 transition-transform group no-print"
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
