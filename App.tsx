import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { AdBanner } from './components/AdBanner';
import { PaymentModal } from './components/DonationModal'; 
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { ProPlusPromoModal } from './components/ProPlusPromoModal';
import { generateTailoredApplication, scrapeJobFromUrl, analyzeMatch } from './services/geminiService';
import { createSubscription, verifySubscription, saveOrder, restoreOrder } from './services/subscriptionService';
import { FileData, GeneratorResponse, Status, MatchAnalysis } from './types';
import { APP_NAME } from './constants';
import { generateWordDocument } from './utils/docHelper';
import { generateSelectablePdf } from './utils/pdfHelper';

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
  
  // Payment, Ads, Restore & Subscription State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false); 
  const [showPromoModal, setShowPromoModal] = useState(false); // New Promo Modal
  
  const [isPaid, setIsPaid] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [restoreIdInput, setRestoreIdInput] = useState('');
  
  // New Subscription State
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);

  // Check for stored subscription on load
  useEffect(() => {
    const storedSub = localStorage.getItem('cv_subscription_id');
    if (storedSub) {
        checkSubscription(storedSub, true);
    }
  }, []);

  const checkSubscription = async (subId: string, silent: boolean = false) => {
      if (!silent) setStatus(Status.SCANNING); // Temporary UI feedback
      
      const { active, expiresAt } = await verifySubscription(subId);
      
      if (active) {
          setSubscriptionId(subId);
          setSubscriptionActive(true);
          setSubscriptionExpiry(expiresAt || null);
          localStorage.setItem('cv_subscription_id', subId);
          if (!silent) alert(`Pro Plus Mode Activated!\nID: ${subId}`);
      } else {
          localStorage.removeItem('cv_subscription_id'); // Clear invalid
          
          if (!silent) {
              // Specific expiration check
              if (expiresAt) {
                  const expiryDate = new Date(expiresAt).toLocaleDateString();
                  alert(`This Pro Plus ID expired on ${expiryDate}.\nPlease renew your subscription to continue using Pro features.`);
              } else {
                  alert("Invalid ID. Please check your Pro Plus ID or CV Order ID.");
              }
          }
      }
      
      if (!silent) setStatus(Status.IDLE);
  };

  // Helper to save current state to local storage
  const saveOrderToStorage = (id: string, data: GeneratorResponse, paid: boolean) => {
    const savedData = {
        result: data,
        date: new Date().toISOString(),
        isPaid: paid
    };
    localStorage.setItem(`cv_order_${id}`, JSON.stringify(savedData));
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
    setIsPaid(false);
    setOrderId(null);

    try {
      const response = await generateTailoredApplication(file, jobSpec, apiKey, force);
      
      if (response.outcome !== 'REJECT') {
          const newOrderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          setOrderId(newOrderId);
          setResult(response);
          saveOrderToStorage(newOrderId, response, false);
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

  const handlePaymentSuccess = async (data: string, isSubscription: boolean) => {
    if (isSubscription) {
        // Data is the plan ID, we need to generate subscription
        const ref = 'PAY-' + Date.now();
        const subResult = await createSubscription(data, ref);
        
        if (subResult.success && subResult.subscriptionId) {
            setSubscriptionId(subResult.subscriptionId);
            setSubscriptionActive(true);
            localStorage.setItem('cv_subscription_id', subResult.subscriptionId);
            alert(`Pro Plus Activated! Your ID is: ${subResult.subscriptionId}. Keep this safe!`);
        }
    } else {
        // Single Order
        const finalId = orderId || data;
        setIsPaid(true);
        setOrderId(finalId);
        
        // Save to Supabase for record keeping AND save content for restoration
        if (result) {
            await saveOrder(finalId, finalId, result);
            saveOrderToStorage(finalId, result, true);
        } else {
            // Fallback for just ID
            await saveOrder(finalId, finalId);
        }

        if (result?.cv) await generateWordDocument(result.cv.title, result.cv.content, undefined, false);
    }
    setShowPaymentModal(false);
  };

  const handleActivateProPlus = async () => {
    if (!restoreIdInput.trim()) return;
    const cleanId = restoreIdInput.trim().toUpperCase();
    
    // Check if it's a Subscription ID
    if (cleanId.startsWith('SUB-')) {
        await checkSubscription(cleanId);
        setRestoreIdInput('');
    } else {
        // Check local storage first
        const saved = localStorage.getItem(`cv_order_${cleanId}`);
        if (saved) {
             const parsed = JSON.parse(saved);
             setResult(parsed.result);
             setIsPaid(parsed.isPaid === true);
             setOrderId(cleanId);
             setStatus(Status.SUCCESS);
             setRestoreIdInput('');
             alert(`CV ID ${cleanId} restored from local history!`);
             return;
        }

        // Check Supabase Cloud Restoration
        setStatus(Status.SCANNING); // UI Feedback while fetching
        
        try {
            const { found, result: restoredResult } = await restoreOrder(cleanId);
            
            if (found) {
                 setOrderId(cleanId);
                 setIsPaid(true);
                 setRestoreIdInput('');
                 
                 if (restoredResult) {
                     // Full content restoration
                     setResult(restoredResult);
                     setStatus(Status.SUCCESS);
                     saveOrderToStorage(cleanId, restoredResult, true); // Cache locally again
                     alert(`Order ${cleanId} restored successfully! Your document is ready.`);
                 } else {
                     // Old order before we started saving content
                     setStatus(Status.IDLE);
                     alert("Order Verified. However, this is an older order where we did not store the content on our servers for privacy. The payment is valid, but you may need to regenerate the CV.");
                 }
            } else {
                 setStatus(Status.IDLE);
                 alert("ID not found. Please check if it is a Pro ID (SUB-...) or CV ID (ORD-...).");
            }
        } catch (e) {
            console.error(e);
            setStatus(Status.IDLE);
            alert("Failed to restore ID due to connection error.");
        }
    }
  };

  // Logic: Unlocked if Single Paid OR Subscription Active
  const isUnlocked = isPaid || subscriptionActive;

  // Trigger Promo only if user is NOT a Pro Plus member
  const triggerPromoIfNeeded = () => {
      if (!subscriptionActive) {
          // Small delay to let download start
          setTimeout(() => {
              setShowPromoModal(true);
          }, 2000);
      }
  };

  const downloadWord = async (filename: string, content: string) => {
     if (!isUnlocked) {
         setShowPaymentModal(true);
         return;
     }
     await generateWordDocument(filename, content, undefined, false);
     triggerPromoIfNeeded();
  };

  const downloadSelectablePdfHandler = async (type: 'cv' | 'coverLetter') => {
      if (!isUnlocked) {
          setShowPaymentModal(true);
          return;
      }
      
      const elementId = type === 'cv' ? 'hidden-cv-content' : 'hidden-cl-content';
      const filename = type === 'cv' ? result?.cv?.title : result?.coverLetter?.title;
      
      if (filename) {
          await generateSelectablePdf(elementId, filename);
          triggerPromoIfNeeded();
      }
  };

  const initiateFreeDownload = () => {
    // If Pro Plus, skip ads directly
    if (subscriptionActive) {
        executeFreeDownload();
    } else {
        setShowAdModal(true);
    }
  };

  const executeFreeDownload = async () => {
    setShowAdModal(false);
    if (result?.cv) {
        // Use generateSelectablePdf for better quality (text vs image)
        await generateSelectablePdf('hidden-cv-content', result.cv.title);
    }
    // Note: Free download NO LONGER includes Cover Letter
    triggerPromoIfNeeded();
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
    setIsPaid(false);
    setOrderId(null);
  };

  // Components for Screen Preview (Larger, Web Optimized)
  const markdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-4xl font-extrabold text-[#2E74B5] text-center border-b-2 border-[#2E74B5] pb-4 mb-8 mt-2 tracking-tight" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-xl font-bold text-[#2E74B5] uppercase border-b border-gray-300 pb-2 mb-4 mt-8 tracking-wide" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-lg font-bold text-slate-900 mb-2 mt-6" {...props} />,
      p: ({node, ...props}: any) => <p className="mb-3 leading-relaxed text-justify text-slate-700" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-700" {...props} />,
      li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-bold text-[#2E74B5]" {...props} />,
  };

  // Components for PDF Generation (Compact, Print Optimized)
  // Text is smaller (xs), margins are tighter
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
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        documentTitle={result?.cv?.title || "Tailored Application"}
        existingOrderId={orderId} 
      />
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      
      {/* Promo Modal shows after download if user is NOT Pro Plus */}
      <ProPlusPromoModal 
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onUpgrade={() => {
            setShowPromoModal(false);
            setShowPaymentModal(true);
        }}
      />

      <RewardedAdModal 
        isOpen={showAdModal} 
        onClose={() => setShowAdModal(false)} 
        onComplete={executeFreeDownload} 
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
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-8">
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
             {subscriptionActive ? (
                 <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                     <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                     <div>
                         <p className="font-bold text-sm">Pro Plus Active</p>
                         <p className="text-[10px] text-indigo-200">ID: {subscriptionId}</p>
                     </div>
                 </div>
             ) : (
                <button 
                    onClick={() => setShowPaymentModal(true)} 
                    className="text-xs text-indigo-600 font-bold hover:underline"
                >
                    Upgrade to Pro Plus
                </button>
             )}

             <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2">
                 <input 
                    type="text" 
                    placeholder="Enter CV ID or Pro ID"
                    value={restoreIdInput}
                    onChange={(e) => setRestoreIdInput(e.target.value)}
                    className="px-3 py-2 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-56 bg-transparent"
                 />
                 <button 
                    onClick={handleActivateProPlus}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors whitespace-nowrap"
                 >
                    Restore
                 </button>
             </div>
          </div>
        </header>

        {/* HIDE ADS IF PRO PLUS */}
        {!subscriptionActive && <AdBanner slotId={101} className="hidden md:flex" />}

        <main className="grid grid-cols-1 gap-8">
          
          {(status === Status.IDLE || status === Status.ERROR) && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-fade-in">
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
                  Powered by Llama 3.3 70B via Cerebras
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
                         {status === Status.SCANNING && (inputMode === 'url' ? 'Extracting details from the provided URL.' : 'Reading provided job text.')}
                         {status === Status.ANALYZING && 'Comparing your profile against the requirements.'}
                         {status === Status.GENERATING && 'Optimizing keywords and achievements.'}
                     </p>
                 </div>
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
               
               {(orderId || subscriptionId) && (
                   <div className={`border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 ${isUnlocked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                       <div className="flex items-center gap-3">
                           <div className="bg-white p-2 rounded-full shadow-sm">
                               {isUnlocked ? (
                                   <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                               ) : (
                                   <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               )}
                           </div>
                           <div>
                               <p className="font-bold">{isUnlocked ? 'Unlocked & Ready' : 'Document Generated Successfully'}</p>
                               <p className="text-sm">
                                   ID: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 select-all">{subscriptionActive ? subscriptionId : orderId}</strong>
                                   {!isUnlocked && <span className="ml-2 opacity-75">(Save this to come back later)</span>}
                               </p>
                           </div>
                       </div>
                       <Button onClick={reset} variant="secondary" className="text-sm h-10">Create New</Button>
                   </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Downloads</h3>
                            <div className="space-y-3">
                                
                                {isUnlocked ? (
                                    <>
                                        <Button 
                                            onClick={() => result.cv && downloadWord(result.cv.title, result.cv.content)} 
                                            className="w-full justify-between bg-blue-600 hover:bg-blue-700"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Download MS Word
                                            </span>
                                        </Button>
                                        
                                        <Button 
                                            onClick={() => downloadSelectablePdfHandler('cv')} 
                                            className="w-full justify-between bg-red-600 hover:bg-red-700"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                Download PDF (Selectable)
                                            </span>
                                        </Button>

                                        <div className="pt-2 border-t border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Cover Letter</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => result.coverLetter && downloadWord(result.coverLetter.title, result.coverLetter.content)} className="text-xs bg-blue-50 text-blue-700 p-2 rounded hover:bg-blue-100 font-medium">Word</button>
                                                <button onClick={() => downloadSelectablePdfHandler('coverLetter')} className="text-xs bg-red-50 text-red-700 p-2 rounded hover:bg-red-100 font-medium">PDF</button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Button 
                                            onClick={() => setShowPaymentModal(true)} 
                                            className="w-full justify-between bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <span>Unlock Full Bundle</span>
                                            <span className="bg-indigo-800 text-xs py-1 px-2 rounded">R100</span>
                                        </Button>
                                        
                                        <Button 
                                            variant="secondary"
                                            disabled
                                            className="w-full justify-between opacity-60"
                                        >
                                            <span>Cover Letter (Locked)</span>
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </Button>

                                        <div className="pt-4 border-t border-slate-100">
                                            <button 
                                                onClick={initiateFreeDownload}
                                                className="w-full text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                {subscriptionActive ? 'Download PDF' : 'Download Free CV (PDF)'}
                                            </button>
                                            {!subscriptionActive && (
                                                <p className="text-[10px] text-center text-slate-400 mt-2">
                                                    (Cover Letter included in Pro version)
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                   </div>

                   <div className="lg:col-span-2">
                       <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[600px]">
                           <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                               <span className="font-bold text-slate-700">Preview: {result.cv?.title}</span>
                               {!isUnlocked && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">PREVIEW MODE</span>}
                           </div>
                           <div className="p-8 h-[600px] overflow-y-auto relative bg-white">
                               {!isUnlocked && (
                                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden">
                                       <div className="transform -rotate-45 text-slate-900/5 text-6xl font-black whitespace-nowrap">CV TAILOR PRO • UNPAID PREVIEW</div>
                                   </div>
                               )}
                               <div className="relative z-0 prose prose-sm max-w-none text-slate-800">
                                   <ReactMarkdown components={markdownComponents}>
                                     {result.cv?.content || ''}
                                   </ReactMarkdown>
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
              <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
                 <Button variant="secondary" onClick={reset} className="w-full md:w-auto">Try a Different Role</Button>
                 <Button variant="primary" onClick={() => handleGenerate(true)} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900">Force Generation</Button>
              </div>
            </div>
          )}

        </main>
        
        {/* HIDE ADS IF PRO PLUS */}
        {!subscriptionActive && <AdBanner slotId={102} />}
        
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