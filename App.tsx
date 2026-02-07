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
import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch } from './services/geminiService';
import { createSubscription, verifySubscription } from './services/subscriptionService';
import { FileData, GeneratorResponse, Status, MatchAnalysis } from './types';
import { APP_NAME } from './constants';
import { generateWordDocument, createWordBlob } from './utils/docHelper';
import { createPdfBlob } from './utils/pdfHelper';

const App: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  
  // Job Input State
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [jobLink, setJobLink] = useState('');
  const [manualJobText, setManualJobText] = useState('');
  const [jobSpec, setJobSpec] = useState(''); 
  
  const [apiKey] = useState('csk-rmv54ykfk8mp439ww3xrrjy98nk3phnh3hentfprjxp2xwv3');
  
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [result, setResult] = useState<GeneratorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);

  // Subscription State
  const [isProPlus, setIsProPlus] = useState(false); // No ads, unlimited downloads
  const [isProOneTime, setIsProOneTime] = useState(false); // Has ads, can download DOCX/Zip for current session
  
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [restoreIdInput, setRestoreIdInput] = useState('');

  // UI State for Preview
  const [previewTab, setPreviewTab] = useState<'cv' | 'cl'>('cv');
  
  // Loading states
  const [isZipping, setIsZipping] = useState(false);
  const [isDownloadingCv, setIsDownloadingCv] = useState(false);
  const [isDownloadingCl, setIsDownloadingCl] = useState(false);
  
  // Temp state to trigger PDF download after ad
  const [pendingPdfType, setPendingPdfType] = useState<'cv' | 'cl' | null>(null);

  // Check for stored subscription on load
  useEffect(() => {
    const storedSub = localStorage.getItem('cv_subscription_id');
    if (storedSub) {
        checkSubscription(storedSub, true);
    }
  }, []);

  const checkSubscription = async (subId: string, silent: boolean = false) => {
      const { active, isProPlus: isProPlusActive } = await verifySubscription(subId);
      
      if (active) {
          setSubscriptionId(subId);
          localStorage.setItem('cv_subscription_id', subId);
          
          if (isProPlusActive) {
              setIsProPlus(true);
              setIsProOneTime(true); // Pro Plus includes Pro features
              if (!silent) alert(`Pro Plus Active: Ads Removed!\nID: ${subId}`);
          } else {
              // It's a valid one-time code (ORD-...) or non-Pro+ sub
              setIsProOneTime(true);
              setIsProPlus(false);
              if (!silent) alert(`Pro Access Active (Single Session).\nID: ${subId}`);
          }
      } else {
          localStorage.removeItem('cv_subscription_id');
          if (!silent) alert("Invalid or Expired ID.");
      }
  };

  const handlePaymentSuccess = async (planId: string, isSubscription: boolean) => {
    const ref = 'PAY-' + Date.now();
    const subResult = await createSubscription(planId, ref);
    
    if (subResult.success && subResult.subscriptionId) {
        setSubscriptionId(subResult.subscriptionId);
        localStorage.setItem('cv_subscription_id', subResult.subscriptionId);
        
        if (planId === 'one_time') {
            setIsProOneTime(true);
            alert(`Downloads Unlocked! Your ID is: ${subResult.subscriptionId}`);
        } else {
            setIsProPlus(true);
            setIsProOneTime(true);
            alert(`Pro Plus Activated! Ads Removed.\nYour ID is: ${subResult.subscriptionId}`);
        }
    }
    setShowPaymentModal(false);
  };

  const handleRestoreId = () => {
      if (restoreIdInput.trim()) {
          checkSubscription(restoreIdInput.trim());
      }
  };

  const handleScanAndAnalyze = async () => {
      if (!file) return;
      if (inputMode === 'url' && !jobLink) return;
      if (inputMode === 'text' && !manualJobText.trim()) return;
      
      setStatus(Status.SCANNING);
      setErrorMsg(null);
      setAnalysis(null);
      setJobSpec('');

      try {
          let textToAnalyze = '';

          if (inputMode === 'url') {
              textToAnalyze = await scrapeJobFromUrl(jobLink);
          } else {
              textToAnalyze = manualJobText;
          }

          if (!textToAnalyze || textToAnalyze.length < 20) {
              throw new Error("Job description is too short. Please provide more details.");
          }

          setJobSpec(textToAnalyze);
          setStatus(Status.ANALYZING);

          const analysisResult = await analyzeMatch(file, textToAnalyze, apiKey);
          setAnalysis(analysisResult);
          setStatus(Status.ANALYSIS_COMPLETE);

      } catch (e: any) {
          console.error(e);
          setStatus(Status.ERROR);
          setErrorMsg(e.message || "Failed to scan or analyze job.");
      }
  };

  const handleGenerate = async (forceOverride: boolean = false) => {
    const force = typeof forceOverride === 'boolean' ? forceOverride : false;

    if (!file || !jobSpec.trim() || !apiKey.trim()) return;

    setStatus(Status.GENERATING);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await generateTailoredApplication(file, jobSpec, apiKey, force);
      
      if (response.outcome !== 'REJECT') {
          setResult(response);
          setStatus(Status.SUCCESS);
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

  // --- Download Handlers ---

  const initiateFreePdfDownload = (type: 'cv' | 'cl') => {
      setPendingPdfType(type);
      setShowRewardedModal(true);
  };

  const completeFreePdfDownload = async () => {
      setShowRewardedModal(false);
      if (pendingPdfType) {
          await executePdfDownload(pendingPdfType);
          setPendingPdfType(null);
      }
  };

  const executePdfDownload = async (type: 'cv' | 'cl') => {
      if (!result) return;
      
      const elementId = type === 'cv' ? 'hidden-cv-content' : 'hidden-cl-content';
      const doc = type === 'cv' ? result.cv : result.coverLetter;
      
      if (doc) {
          const blob = await createPdfBlob(elementId);
          if (blob) {
              saveAs(blob, (doc.title || `Tailored_${type.toUpperCase()}`).replace('.docx', '') + '.pdf');
          }
      }
  };

  const handleDownloadWord = async (type: 'cv' | 'cl') => {
     if (!isProOneTime && !isProPlus) {
         setShowPaymentModal(true);
         return;
     }

     if (!result) return;
     
     if (type === 'cv') setIsDownloadingCv(true);
     else setIsDownloadingCl(true);

     const doc = type === 'cv' ? result.cv : result.coverLetter;
     if (doc) {
        await generateWordDocument(doc.title || `Tailored_${type.toUpperCase()}.docx`, doc.content, undefined, false);
     }

     if (type === 'cv') setIsDownloadingCv(false);
     else setIsDownloadingCl(false);
  };

  const handleDownloadAllZip = async () => {
      if (!isProOneTime && !isProPlus) {
          setShowPaymentModal(true);
          return;
      }

      if (!result) return;
      
      setIsZipping(true);

      try {
          const zip = new JSZip();
          
          if (result.cv) {
              const cvBlob = await createWordBlob(result.cv.content);
              if (cvBlob) zip.file(result.cv.title || 'Tailored_CV.docx', cvBlob);
          }

          if (result.coverLetter) {
              const clBlob = await createWordBlob(result.coverLetter.content);
              if (clBlob) zip.file(result.coverLetter.title || 'Cover_Letter.docx', clBlob);
          }
          
          const cvPdfBlob = await createPdfBlob('hidden-cv-content');
          if (cvPdfBlob && result.cv) zip.file((result.cv.title || 'Tailored_CV').replace('.docx', '') + '.pdf', cvPdfBlob);
          
          const clPdfBlob = await createPdfBlob('hidden-cl-content');
          if (clPdfBlob && result.coverLetter) zip.file((result.coverLetter.title || 'Cover_Letter').replace('.docx', '') + '.pdf', clPdfBlob);

          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, `Application_Package.zip`);
          
      } catch (e) {
          console.error("Zip failed", e);
          alert("Failed to create zip file.");
      } finally {
          setIsZipping(false);
      }
  };

  const reset = () => {
    setFile(null);
    setJobLink('');
    setJobSpec('');
    setManualJobText('');
    setInputMode('url');
    setStatus(Status.IDLE);
    setResult(null);
    setAnalysis(null);
  };

  // Components for Screen Preview
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
      h1: ({node, ...props}: any) => <h1 className="text-2xl font-extrabold text-[#2E74B5] text-center border-b-2 border-[#2E74B5] pb-2 mb-4 mt-0 tracking-tight" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-base font-bold text-[#2E74B5] uppercase border-b border-gray-300 pb-1 mb-2 mt-4 tracking-wide" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-sm font-bold text-slate-900 mb-1 mt-3" {...props} />,
      p: ({node, ...props}: any) => <p className="mb-2 leading-snug text-justify text-slate-900 text-xs" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-4 space-y-1 mb-3 text-slate-900 text-xs" {...props} />,
      li: ({node, ...props}: any) => <li className="pl-0.5" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-bold text-[#2E74B5]" {...props} />,
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
                  <Button onClick={() => handleGenerate(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">Generate Tailored CV</Button>
                  {!isPositive && <Button onClick={reset} variant="secondary" className="w-1/3">Cancel</Button>}
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans relative">
      
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        documentTitle={result?.cv?.title || "Tailored Application"}
        existingOrderId={null}
      />

      <RewardedAdModal 
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        onComplete={completeFreePdfDownload}
      />

      {/* Hidden Render Container for PDF */}
      {result && (
        <div className="fixed left-[-9999px] top-0">
            <div id="hidden-cv-content" className="bg-white p-[12mm] w-[210mm] text-slate-900">
                <ReactMarkdown components={pdfMarkdownComponents}>{result.cv?.content || ''}</ReactMarkdown>
            </div>
            <div id="hidden-cl-content" className="bg-white p-[12mm] w-[210mm] text-slate-900">
                <ReactMarkdown components={pdfMarkdownComponents}>{result.coverLetter?.content || ''}</ReactMarkdown>
            </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-8 relative">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
            </div>
            <p className="text-slate-600 text-sm">Tailor your CV to beat ATS bots and land interviews.</p>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-2">
             {isProPlus ? (
                 <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <div>
                         <p className="font-bold text-sm">Pro Plus Active</p>
                         <p className="text-[10px] opacity-80">Ad-Free Experience</p>
                     </div>
                 </div>
             ) : isProOneTime ? (
                <div className="flex flex-col items-end gap-2">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold">
                        Single Order Unlocked
                    </div>
                     <button 
                        onClick={() => setShowPaymentModal(true)} 
                        className="text-indigo-600 font-bold text-xs hover:underline"
                    >
                        Upgrade to Remove Ads
                    </button>
                </div>
             ) : (
                <div className="flex flex-col items-end gap-2">
                    <button 
                        onClick={() => setShowPaymentModal(true)} 
                        className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                        Remove Ads
                    </button>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Restore ID"
                            value={restoreIdInput}
                            onChange={(e) => setRestoreIdInput(e.target.value)}
                            className="px-2 py-1 text-xs outline-none bg-transparent w-32"
                        />
                        <button onClick={handleRestoreId} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            Apply
                        </button>
                    </div>
                </div>
             )}
          </div>
        </header>

        <main className="grid grid-cols-1 gap-8">
          
          {(status === Status.IDLE || status === Status.ERROR) && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-fade-in">
              
              {!isProPlus && (
                  <AdBanner suffix="top" format="horizontal" />
              )}

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  1. Upload your Current CV
                </label>
                <FileUpload onFileSelect={setFile} selectedFileName={file?.name} />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      2. Job Details
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setInputMode('url')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${inputMode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Link
                        </button>
                        <button 
                            onClick={() => setInputMode('text')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${inputMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Text
                        </button>
                    </div>
                </div>

                {inputMode === 'url' ? (
                    <>
                        <div className="flex gap-2">
                            <input
                              type="url"
                              value={jobLink}
                              onChange={(e) => setJobLink(e.target.value)}
                              placeholder="https://linkedin.com/jobs/..."
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                            />
                        </div>
                        <p className="text-xs text-slate-400">Supported: LinkedIn, Indeed, Glassdoor, Company Pages.</p>
                    </>
                ) : (
                     <textarea 
                        value={manualJobText}
                        onChange={(e) => setManualJobText(e.target.value)}
                        placeholder="Paste the full job description here (Responsibilities, Requirements, etc)..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 h-32 text-sm resize-none"
                    />
                )}
              </div>

              {/* Ad Banner moved here between Job Details and Scan Button */}
              {!isProPlus && (
                  <AdBanner suffix="middle" format="horizontal" />
              )}

              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={handleScanAndAnalyze} 
                  disabled={!file || (inputMode === 'url' ? !jobLink : !manualJobText.trim())}
                  className="w-full text-lg py-4 bg-slate-800 hover:bg-slate-900"
                >
                  {inputMode === 'url' ? 'Scan Link & Analyze Match' : 'Analyze Job Match'}
                </Button>
                <p className="text-xs text-center text-slate-400 mt-4">
                  Free Tool • Powered by Llama 3.3 70B via Cerebras
                </p>
              </div>
            </div>
          )}

          {(status === Status.SCANNING || status === Status.ANALYZING || status === Status.GENERATING) && (
             <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                 <div className="relative w-20 h-20">
                     <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">
                         {status === Status.SCANNING && 'Processing Job Details...'}
                         {status === Status.ANALYZING && 'Analyzing Match Viability...'}
                         {status === Status.GENERATING && 'Tailoring your CV...'}
                     </h3>
                     <p className="text-slate-500 mt-2">
                         Please wait while our AI models work their magic.
                     </p>
                 </div>
                 
                 {!isProPlus && (
                     <div className="w-full flex justify-center mt-8">
                         <AdBanner suffix="loading" format="rectangle" />
                     </div>
                 )}
             </div>
          )}

          {status === Status.ANALYSIS_COMPLETE && analysis && (
              <div className="space-y-6">
                  <div className="flex items-center gap-2 text-slate-500 mb-2 cursor-pointer hover:text-indigo-600" onClick={reset}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back to Inputs
                  </div>
                  <AnalysisDashboard />
              </div>
          )}

          {status === Status.SUCCESS && result && (
            <div className="animate-fade-in space-y-6">
               <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3">
                   <div className="bg-white p-2 rounded-full shadow-sm">
                       <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <div>
                       <p className="font-bold">Document Generated Successfully</p>
                   </div>
                   <Button onClick={reset} variant="secondary" className="text-sm h-10 ml-auto">Create New</Button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Downloads</h3>
                            
                            {/* Download screen ad: Rectangle format fits better in sidebar */}
                            {!isProPlus && <AdBanner className="mb-6" suffix="download" format="rectangle" />}

                            <div className="space-y-3">
                                {/* Zip Download (Paid) */}
                                <Button 
                                    onClick={handleDownloadAllZip} 
                                    className="w-full justify-between bg-indigo-600 hover:bg-indigo-700"
                                    isLoading={isZipping}
                                >
                                    <span className="flex items-center gap-2">
                                        {(isProOneTime || isProPlus) ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        )}
                                        Download All (Zip)
                                    </span>
                                </Button>
                                
                                {/* Word Download (Paid) */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => handleDownloadWord('cv')}
                                        variant="secondary"
                                        className="w-full text-xs px-2"
                                        isLoading={isDownloadingCv}
                                    >
                                        {(isProOneTime || isProPlus) ? 'CV (Word)' : 'Unlock DOCX'}
                                    </Button>

                                    <Button 
                                        onClick={() => handleDownloadWord('cl')}
                                        variant="secondary"
                                        className="w-full text-xs px-2"
                                        isLoading={isDownloadingCl}
                                    >
                                        {(isProOneTime || isProPlus) ? 'Letter (Word)' : 'Unlock DOCX'}
                                    </Button>
                                </div>
                                
                                {/* PDF Download (Free with Ads) */}
                                <div className="border-t border-slate-100 pt-3 mt-1">
                                    <p className="text-xs text-slate-500 mb-2 font-semibold">Free Downloads (PDF Only):</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => initiateFreePdfDownload('cv')}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            CV (PDF)
                                        </button>
                                        <button 
                                            onClick={() => initiateFreePdfDownload('cl')}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Letter (PDF)
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 text-center italic">Watch a short ad to download PDF</p>
                                </div>
                            </div>
                        </div>
                   </div>

                   <div className="lg:col-span-2">
                       <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[600px] flex flex-col">
                           <div className="bg-slate-100 p-0 border-b border-slate-200 flex justify-between items-center">
                               <div className="flex">
                                   <button 
                                     onClick={() => setPreviewTab('cv')}
                                     className={`px-6 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${previewTab === 'cv' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                   >
                                     CV Preview
                                   </button>
                                   <button 
                                     onClick={() => setPreviewTab('cl')}
                                     className={`px-6 py-4 font-bold text-sm uppercase tracking-wider transition-colors ${previewTab === 'cl' ? 'bg-white text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                   >
                                     Cover Letter
                                   </button>
                               </div>
                           </div>
                           
                           {/* Preview Content Area */}
                           <div className="p-8 h-[600px] overflow-y-auto relative bg-white">
                               <div className="relative z-0 prose prose-sm max-w-none text-slate-800">
                                   {previewTab === 'cv' ? (
                                       <ReactMarkdown components={markdownComponents}>
                                         {result.cv?.content || ''}
                                       </ReactMarkdown>
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
            <div className="bg-white rounded-2xl shadow-xl border-l-8 border-red-500 p-8 space-y-6 animate-fade-in">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Not Recommended</h2>
                    <p className="text-slate-600 mb-6">
                      System analysis suggests a weak match.
                    </p>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-4">
                        <div>
                            <h4 className="font-bold text-red-800 mb-1">Reason:</h4>
                            <p className="text-red-700">{result.rejectionDetails?.reason}</p>
                        </div>
                    </div>
                 </div>
              </div>
              
              {!isProPlus && <AdBanner suffix="reject" format="horizontal" />}

              <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                 <Button variant="secondary" onClick={reset} className="w-full md:w-auto">Try a Different Role</Button>
                 <Button variant="primary" onClick={() => handleGenerate(true)} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900">Force Generation</Button>
              </div>
            </div>
          )}

        </main>
        
        <footer className="text-center text-slate-400 text-sm py-8 space-y-2 border-t border-slate-200 mt-12">
          <p>&copy; {new Date().getFullYear()} CV Tailor Pro.</p>
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => setShowPrivacyModal(true)} className="text-slate-400 hover:text-slate-600 underline underline-offset-2 text-xs">Privacy Policy</button>
            <p className="text-xs">Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-400 hover:underline">customerservice@goapply.co.za</a></p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;