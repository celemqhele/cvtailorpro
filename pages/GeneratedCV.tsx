
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { SavedApplication, CVData } from '../types';
import CVTemplate from '../components/CVTemplate';
import CoverLetterTemplate from '../components/CoverLetterTemplate';
import { createWordBlob } from '../utils/docHelper';
import { generatePdfFromApi } from '../utils/pdfHelper';
import JSZip from 'jszip';
import saveAs from 'file-saver';

export const GeneratedCV: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<SavedApplication | null>(null);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cv' | 'cl'>('cv');
  const [isDownloading, setIsDownloading] = useState(false);

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
        setApplication(app);
        
        try {
            const parsed = JSON.parse(app.cv_content);
            setCvData(parsed);
        } catch (e) {
            console.error("Failed to parse CV content");
        }
    } catch (e) {
        console.error(e);
        // Could redirect or show error
    } finally {
        setIsLoading(false);
    }
  };

  const downloadBundle = async () => {
      if (!application || !cvData) return;
      setIsDownloading(true);

      try {
          const zip = new JSZip();
          const baseName = `${cvData.name} - ${application.job_title}`;

          // Add DOCX
          const cvDocBlob = await createWordBlob('cv-render-target');
          if (cvDocBlob) zip.file(`${baseName} - CV.docx`, cvDocBlob);

          if (application.cl_content) {
            const clDocBlob = await createWordBlob('cl-render-target');
            if (clDocBlob) zip.file(`${baseName} - Cover Letter.docx`, clDocBlob);
          }

          // Add PDF
          // Temporarily ensure elements are visible/styled for print
          const cvPdfBlob = await generatePdfFromApi('cv-render-target');
          if (cvPdfBlob) zip.file(`${baseName} - CV.pdf`, cvPdfBlob);

          if (application.cl_content) {
             const clPdfBlob = await generatePdfFromApi('cl-render-target');
             if (clPdfBlob) zip.file(`${baseName} - Cover Letter.pdf`, clPdfBlob);
          }

          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, `${baseName}.zip`);

      } catch (e) {
          console.error("Download failed", e);
          alert("Failed to generate download. Please try again.");
      } finally {
          setIsDownloading(false);
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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
       {/* Top Bar */}
       <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
               <div className="flex items-center gap-4">
                   <Link to="/dashboard" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       Back
                   </Link>
                   <div className="h-6 w-px bg-slate-200"></div>
                   <div>
                       <h1 className="text-lg font-bold text-slate-900 leading-none">{application.job_title}</h1>
                       <p className="text-xs text-slate-500">{application.company_name} • {new Date(application.created_at).toLocaleDateString()}</p>
                   </div>
               </div>

               <div className="flex items-center gap-3">
                   <button 
                     onClick={downloadBundle} 
                     disabled={isDownloading}
                     className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                   >
                     {isDownloading ? (
                        <>
                           <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           Generating...
                        </>
                     ) : (
                        <>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                           Download Bundle
                        </>
                     )}
                   </button>
               </div>
           </div>
       </div>

       {/* Main Content */}
       <div className="max-w-5xl mx-auto px-4 py-8">
           
           {/* Controls */}
           <div className="flex justify-center mb-8">
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
           <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[1100px] border border-slate-200">
               <div className="overflow-x-auto bg-slate-100/50 p-8 md:p-12 flex justify-center">
                   
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
    </div>
  );
};
