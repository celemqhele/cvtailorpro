import React, { useState } from 'react';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { AdBanner } from './components/AdBanner';
import { DonationModal } from './components/DonationModal';
import { generateTailoredApplication } from './services/geminiService';
import { FileData, GeneratorResponse, Status } from './types';
import { APP_NAME } from './constants';
import { generateWordDocument } from './utils/docHelper';

const App: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [jobSpec, setJobSpec] = useState('');
  const [apiKey] = useState('csk-rmv54ykfk8mp439ww3xrrjy98nk3phnh3hentfprjxp2xwv3');
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);

  const handleGenerate = async (forceOverride: boolean = false) => {
    // Ensure forceOverride is a boolean (onClick passes event object)
    const force = typeof forceOverride === 'boolean' ? forceOverride : false;

    if (!file || !jobSpec.trim() || !apiKey.trim()) return;

    setStatus(Status.LOADING);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await generateTailoredApplication(file, jobSpec, apiKey, force);
      setResult(response);
      setStatus(response.outcome === 'REJECT' ? Status.REJECTED : Status.SUCCESS);
      
      // Trigger donation popup if successful
      if (response.outcome === 'PROCEED') {
        setTimeout(() => setShowDonationModal(true), 1500); // Small delay for UX
      }
    } catch (e: any) {
      console.error(e);
      setStatus(Status.ERROR);
      setErrorMsg(e.message || "An unexpected error occurred.");
    }
  };

  const downloadWord = async (filename: string, content: string, brandingImage?: string) => {
     await generateWordDocument(filename, content, brandingImage);
  };

  const reset = () => {
    setFile(null);
    setJobSpec('');
    setStatus(Status.IDLE);
    setResult(null);
    setShowDonationModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg mb-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Powered by <strong>Cerebras Cloud (Llama 3.1)</strong>. Upload your CV (.docx/txt) and a job description for instant AI tailoring.
          </p>
        </header>

        {/* Top Ad Banner */}
        <AdBanner className="hidden md:flex" />

        {/* Main Interface */}
        <main className="grid grid-cols-1 gap-8">
          
          {/* Input Section */}
          {(status === Status.IDLE || status === Status.LOADING || status === Status.ERROR) && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
              
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  1. Upload your Current CV
                </label>
                <FileUpload 
                  onFileSelect={setFile} 
                  selectedFileName={file?.name} 
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  2. Paste Job Specification
                </label>
                <textarea
                  value={jobSpec}
                  onChange={(e) => setJobSpec(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="w-full h-48 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-700"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => handleGenerate(false)} 
                  isLoading={status === Status.LOADING}
                  disabled={!file || !jobSpec}
                  className="w-full text-lg py-4 bg-indigo-600 hover:bg-indigo-700"
                >
                  {status === Status.LOADING ? 'Tailoring Application...' : 'Generate Tailored CV'}
                </Button>
                <p className="text-xs text-center text-slate-400 mt-4">
                  Using Cerebras Inference Speed (Llama 3.1 8B).
                </p>
              </div>
            </div>
          )}

          {/* Result Section - Success */}
          {status === Status.SUCCESS && result && (
            <div className="space-y-8 animate-fade-in">
               <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-3xl font-bold text-green-800">Application Tailored Successfully!</h2>
                  <p className="text-green-700 max-w-xl mx-auto">
                    Your CV and Cover Letter have been optimized for ATS (≥85% Match Target).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    {result.cv && (
                      <div className="bg-white p-6 rounded-xl shadow-md border border-green-100 flex flex-col justify-between h-full">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Document 1</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Tailored CV</h3>
                            <p className="text-sm text-slate-500 mb-6 truncate">{result.cv.title}</p>
                        </div>
                        <Button onClick={() => result.cv && downloadWord(result.cv.title, result.cv.content, undefined)} className="bg-indigo-600 hover:bg-indigo-700">
                          Download CV (.docx)
                        </Button>
                      </div>
                    )}
                    
                    {result.coverLetter && (
                       <div className="bg-white p-6 rounded-xl shadow-md border border-green-100 flex flex-col justify-between h-full">
                        <div>
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Document 2</div>
                           <h3 className="text-xl font-bold text-slate-800 mb-2">Cover Letter</h3>
                           <p className="text-sm text-slate-500 mb-6 truncate">{result.coverLetter.title}</p>
                        </div>
                        <Button variant="secondary" onClick={() => result.coverLetter && downloadWord(result.coverLetter.title, result.coverLetter.content)}>
                          Download Cover Letter (.docx)
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={reset}
                      className="text-slate-500 hover:text-slate-800 font-medium underline underline-offset-4"
                    >
                      Start Over
                    </button>
                  </div>
               </div>
            </div>
          )}

          {/* Result Section - Rejected */}
          {status === Status.REJECTED && result && (
            <div className="bg-white rounded-2xl shadow-xl border-l-8 border-red-500 p-8 space-y-6 animate-fade-in">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Not Recommended</h2>
                    <p className="text-slate-600 mb-6">
                      Based on the analysis of your CV and the job description, the system has determined that this role is not a strong match for your current profile.
                    </p>
                    
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-4">
                        <div>
                            <h4 className="font-bold text-red-800 mb-1">Reason for Rejection:</h4>
                            <p className="text-red-700">{result.rejectionDetails?.reason}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800 mb-1">Suggested Direction:</h4>
                            <p className="text-red-700">{result.rejectionDetails?.suggestion}</p>
                        </div>
                    </div>
                 </div>
              </div>
              <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                 <Button variant="secondary" onClick={reset} className="w-full md:w-auto">Try a Different Role</Button>
                 <Button variant="primary" onClick={() => handleGenerate(true)} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900">Generate Anyway (Force)</Button>
              </div>
            </div>
          )}

        </main>
        
        {/* Bottom Ad Banner */}
        <AdBanner />

        <footer className="text-center text-slate-400 text-sm py-8">
          &copy; {new Date().getFullYear()} CV Tailor Pro. Privacy Focused - No data is stored.
        </footer>
      </div>
    </div>
  );
};

export default App;