import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { AdBanner } from './components/AdBanner';
import { PaymentModal } from './components/DonationModal'; 
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
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
  
  // Payment & Restore State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [restoreIdInput, setRestoreIdInput] = useState('');

  const handleGenerate = async (forceOverride: boolean = false) => {
    const force = typeof forceOverride === 'boolean' ? forceOverride : false;

    if (!file || !jobSpec.trim() || !apiKey.trim()) return;

    setStatus(Status.LOADING);
    setErrorMsg(null);
    setResult(null);
    setIsPaid(false);
    setOrderId(null);

    try {
      const response = await generateTailoredApplication(file, jobSpec, apiKey, force);
      setResult(response);
      setStatus(response.outcome === 'REJECT' ? Status.REJECTED : Status.SUCCESS);
    } catch (e: any) {
      console.error(e);
      setStatus(Status.ERROR);
      setErrorMsg(e.message || "An unexpected error occurred.");
    }
  };

  const handlePaymentSuccess = async (newOrderId: string) => {
    setIsPaid(true);
    setOrderId(newOrderId);
    setShowPaymentModal(false);

    // Save to Local Storage for "Restore" functionality
    if (result) {
        const savedData = {
            result: result,
            date: new Date().toISOString()
        };
        localStorage.setItem(`cv_order_${newOrderId}`, JSON.stringify(savedData));
    }

    // Auto-download after payment
    if (result?.cv) await generateWordDocument(result.cv.title, result.cv.content, undefined);
    if (result?.coverLetter) await generateWordDocument(result.coverLetter.title, result.coverLetter.content, undefined);
  };

  const handleRestore = () => {
    if (!restoreIdInput.trim()) return;
    const cleanId = restoreIdInput.trim().toUpperCase();
    
    try {
        const saved = localStorage.getItem(`cv_order_${cleanId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setResult(parsed.result);
            setStatus(Status.SUCCESS);
            setIsPaid(true);
            setOrderId(cleanId);
            setRestoreIdInput('');
            alert(`Order ${cleanId} restored successfully!`);
        } else {
            alert("Order ID not found on this device. Please check the ID or ensure you are using the same browser.");
        }
    } catch (e) {
        alert("Failed to restore order.");
    }
  };

  const downloadWord = async (filename: string, content: string) => {
     if (!isPaid) {
         setShowPaymentModal(true);
         return;
     }
     await generateWordDocument(filename, content, undefined);
  };

  const reset = () => {
    setFile(null);
    setJobSpec('');
    setStatus(Status.IDLE);
    setResult(null);
    setIsPaid(false);
    setOrderId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        documentTitle={result?.cv?.title || "Tailored Application"}
      />
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header with Restore Function */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-8">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
            </div>
            <p className="text-slate-600 text-sm">Tailor your CV to beat ATS bots and land interviews.</p>
          </div>

          <div className="w-full md:w-auto bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2">
             <input 
                type="text" 
                placeholder="Enter Order ID to restore"
                value={restoreIdInput}
                onChange={(e) => setRestoreIdInput(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-48"
             />
             <button 
                onClick={handleRestore}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors whitespace-nowrap"
             >
                Restore CV
             </button>
          </div>
        </header>

        {/* Top Ad Banner */}
        <AdBanner slotId={101} className="hidden md:flex" />

        {/* Main Interface */}
        <main className="grid grid-cols-1 gap-8">
          
          {/* Input Section */}
          {(status === Status.IDLE || status === Status.LOADING || status === Status.ERROR) && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-fade-in">
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
                  className="w-full h-48 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-slate-700 font-mono text-sm"
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
                  {status === Status.LOADING ? 'Analyzing & Tailoring...' : 'Generate Tailored CV'}
                </Button>
                <p className="text-xs text-center text-slate-400 mt-4">
                  Powered by Llama 3.1 8B via Cerebras
                </p>
              </div>
            </div>
          )}

          {/* Result Section - Success */}
          {status === Status.SUCCESS && result && (
            <div className="animate-fade-in space-y-6">
               
               {/* Order ID Banner (If Paid) */}
               {isPaid && orderId && (
                   <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                       <div className="flex items-center gap-3">
                           <div className="bg-white p-2 rounded-full">
                               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                           </div>
                           <div>
                               <p className="font-bold">Purchase Successful!</p>
                               <p className="text-sm">Save this Order ID to restore your CV later: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-green-300 select-all">{orderId}</strong></p>
                           </div>
                       </div>
                       <Button onClick={reset} variant="secondary" className="text-sm">Create New</Button>
                   </div>
               )}

               {/* Action Area */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   
                   {/* Left Column: Actions */}
                   <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Downloads</h3>
                            <div className="space-y-3">
                                <Button 
                                    onClick={() => result.cv && downloadWord(result.cv.title, result.cv.content)} 
                                    className={`w-full justify-between ${isPaid ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    <span>Download CV (.docx)</span>
                                    {!isPaid && <span className="bg-indigo-800 text-xs py-1 px-2 rounded">R100</span>}
                                </Button>
                                <Button 
                                    variant="secondary"
                                    onClick={() => result.coverLetter && downloadWord(result.coverLetter.title, result.coverLetter.content)} 
                                    className="w-full justify-between"
                                >
                                    <span>Download Cover Letter</span>
                                    {!isPaid && <span className="bg-slate-200 text-xs py-1 px-2 rounded text-slate-600">Locked</span>}
                                </Button>
                            </div>
                            
                            {!isPaid && (
                                <p className="text-xs text-slate-500 mt-4 text-center">
                                    Secure payment via Paystack. Includes both documents.
                                </p>
                            )}
                        </div>

                        {!isPaid && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                                <strong>Free Option:</strong> You can copy the text from the preview on the right and format it yourself manually.
                            </div>
                        )}

                        <Button 
                            onClick={reset} 
                            variant="secondary" 
                            className="w-full text-slate-600 border-slate-300 hover:bg-slate-100"
                        >
                            Make New CV
                        </Button>
                   </div>

                   {/* Right Column: Preview */}
                   <div className="lg:col-span-2">
                       <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[600px]">
                           
                           {/* Header */}
                           <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                               <span className="font-bold text-slate-700">Preview: {result.cv?.title}</span>
                               {!isPaid && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">PREVIEW MODE</span>}
                           </div>

                           {/* Content Window */}
                           <div className="p-8 h-[600px] overflow-y-auto relative bg-white">
                               {/* Watermark Overlay */}
                               {!isPaid && (
                                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden">
                                       <div className="transform -rotate-45 text-slate-900/5 text-6xl font-black whitespace-nowrap">
                                           CV TAILOR PRO • UNPAID PREVIEW • CV TAILOR PRO
                                       </div>
                                       <div className="transform -rotate-45 text-slate-900/5 text-6xl font-black whitespace-nowrap mt-32">
                                           CV TAILOR PRO • UNPAID PREVIEW • CV TAILOR PRO
                                       </div>
                                       <div className="transform -rotate-45 text-slate-900/5 text-6xl font-black whitespace-nowrap mt-32">
                                           CV TAILOR PRO • UNPAID PREVIEW • CV TAILOR PRO
                                       </div>
                                   </div>
                               )}

                               {/* Text Content - Rendered Markdown */}
                               <div className="relative z-0">
                                   <ReactMarkdown 
                                     className="prose prose-sm max-w-none text-slate-800"
                                     components={{
                                       h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-[#2E74B5] text-center border-b-2 border-[#2E74B5] pb-2 mb-6 mt-2" {...props} />,
                                       h2: ({node, ...props}) => <h2 className="text-xl font-bold text-[#2E74B5] uppercase border-b border-gray-300 pb-1 mb-3 mt-8" {...props} />,
                                       h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-900 mb-2 mt-4" {...props} />,
                                       p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-justify" {...props} />,
                                       ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 mb-4" {...props} />,
                                       li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                       strong: ({node, ...props}) => <strong className="font-bold text-[#2E74B5]" {...props} />,
                                     }}
                                   >
                                     {result.cv?.content}
                                   </ReactMarkdown>
                               </div>
                           </div>
                       </div>
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
        <AdBanner slotId={102} />

        <footer className="text-center text-slate-400 text-sm py-8 space-y-2 border-t border-slate-200 mt-12">
          <p>&copy; {new Date().getFullYear()} CV Tailor Pro.</p>
          <div className="flex justify-center gap-4">
            <button 
                onClick={() => setShowPrivacyModal(true)}
                className="text-slate-400 hover:text-slate-600 underline underline-offset-2 text-xs"
            >
                Privacy Policy
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-400">Restoring CVs requires using the same device/browser.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;