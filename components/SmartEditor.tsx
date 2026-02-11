




import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { CVData } from '../types';
import { extractTextFromFile } from '../services/geminiService';

interface SmartEditorProps {
  cvData: CVData | null;
  clContent?: string;
  viewMode: 'cv' | 'cl';
  onSmartEdit: (instruction: string) => Promise<void>;
  onManualUpdate: (updatedData: CVData) => void;
  onManualUpdateCL: (updatedContent: string) => void;
  isLocked: boolean;
  onUnlock: () => void;
  isProcessing: boolean;
  userPlanId?: string;
}

const CL_PRESETS = [
    { label: "Traditional / Classic", desc: "Formal tone. Standard structure.", prompt: "Rewrite this in a Formal, Professional tone using a standard structure (Intro, Skills, Closing)." },
    { label: "Storytelling / Narrative", desc: "Personal & engaging hook.", prompt: "Rewrite this using a Storytelling approach. Start with a personal anecdote or experience that shows personality." },
    { label: "Skills-Based", desc: "Focus heavily on competencies.", prompt: "Rewrite this to focus heavily on Hard Skills and Competencies, using bullet points for impact." },
    { label: "Networking / Referral", desc: "Mention a mutual contact.", prompt: "Rewrite this as a Networking letter, referencing a mutual contact or referral to get attention." },
    { label: "Creative / Unconventional", desc: "Unique tone & humor.", prompt: "Rewrite this in a Creative, Unconventional tone. Use humor or unique phrasing to stand out." },
    { label: "Email-Style / Concise", desc: "Short & punchy.", prompt: "Rewrite this as a short, punchy Email Body. Focus on interest and key qualifications only." },
    { label: "Combination / Hybrid", desc: "Mix of formal & story.", prompt: "Rewrite this as a Hybrid letter, mixing formal professionalism with a storytelling hook." }
];

export const SmartEditor: React.FC<SmartEditorProps> = ({ 
  cvData, 
  clContent,
  viewMode,
  onSmartEdit, 
  onManualUpdate,
  onManualUpdateCL,
  isLocked, 
  onUnlock,
  isProcessing,
  userPlanId
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [instruction, setInstruction] = useState('');
  
  // Reference File State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [extractedFileText, setExtractedFileText] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Manual Form States
  const [formData, setFormData] = useState<CVData | null>(cvData);
  const [manualCL, setManualCL] = useState(clContent || '');

  // Restrict Reference Uploads to Growth/Pro plans
  const isReferenceUploadAllowed = userPlanId ? ['tier_2', 'tier_3', 'tier_4'].includes(userPlanId) : false;

  // Update form data when props change
  React.useEffect(() => {
    if (cvData) setFormData({ ...cvData });
  }, [cvData]);

  React.useEffect(() => {
    if (clContent) setManualCL(clContent);
  }, [clContent]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isReferenceUploadAllowed) {
          if(confirm("Reference Uploads (e.g. copying another CV's style or adding Certifications from PDF) is available on the Growth Plan and up. Upgrade to unlock?")) {
              onUnlock();
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      setIsReadingFile(true);
      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              try {
                  const text = await extractTextFromFile({
                      base64,
                      mimeType: file.type || 'text/plain',
                      name: file.name
                  });
                  setExtractedFileText(text);
                  setAttachedFileName(file.name);
              } catch (err) {
                  console.error("Extraction error", err);
                  alert("Failed to read file. Please try a standard PDF or DOCX.");
              } finally {
                  setIsReadingFile(false);
              }
          };
          reader.readAsDataURL(file);
      } catch (e) {
          setIsReadingFile(false);
      }
  };

  const removeAttachment = () => {
      setAttachedFileName(null);
      setExtractedFileText(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSmartSubmit = (e: React.FormEvent, presetPrompt?: string) => {
    e.preventDefault();
    if (isLocked) {
        onUnlock();
        return;
    }
    
    let finalInstruction = presetPrompt || instruction;
    
    // Append context if file exists
    if (extractedFileText) {
        finalInstruction += `\n\n=== ATTACHED REFERENCE CONTENT (Use this context) ===\n${extractedFileText}\n=================================================`;
    }

    if (!finalInstruction.trim()) return;
    
    onSmartEdit(finalInstruction);
    setInstruction('');
    removeAttachment();
  };

  const handleManualChange = (field: keyof CVData, value: string) => {
    if (!formData) return;
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const handleManualSave = () => {
    if (isLocked) {
        onUnlock();
        return;
    }
    if (viewMode === 'cv' && formData) {
        onManualUpdate(formData);
    } else if (viewMode === 'cl') {
        onManualUpdateCL(manualCL);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-full flex flex-col overflow-hidden sticky top-20 max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 text-white shrink-0">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {viewMode === 'cv' ? 'Edit CV' : 'Edit Cover Letter'}
                  <span className="bg-amber-400 text-amber-900 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ml-2 shadow-sm">Pro</span>
              </h3>
          </div>
          
          <div className="flex bg-slate-800/50 p-1 rounded-lg">
             <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${activeTab === 'ai' ? 'bg-white text-indigo-900 shadow' : 'text-slate-400 hover:text-white'}`}
             >
                AI Assistant
             </button>
             <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${activeTab === 'manual' ? 'bg-white text-indigo-900 shadow' : 'text-slate-400 hover:text-white'}`}
             >
                Manual Edit
             </button>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
         
         {/* Lock Overlay */}
         {isLocked && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                 <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 mb-3 shadow-md">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <h4 className="font-bold text-slate-900">Unlock Smart Editing</h4>
                 <p className="text-xs text-slate-500 mb-4 mt-1">
                     Make unlimited changes instantly with AI or manually tweak details.
                 </p>
                 <Button onClick={onUnlock} className="w-full text-xs py-2 bg-indigo-600 shadow-lg shadow-indigo-200">
                     Upgrade to Pro
                 </Button>
            </div>
         )}

         {activeTab === 'ai' ? (
             <div className="space-y-4">
                 <p className="text-sm text-slate-600 leading-relaxed">
                     {viewMode === 'cv' 
                        ? "Tell the AI what to change. It will preserve your format." 
                        : "Select a style preset or give custom instructions to rewrite your letter."
                     }
                 </p>
                 
                 {viewMode === 'cl' && (
                     <div className="grid grid-cols-1 gap-2 mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Style Presets</p>
                        {CL_PRESETS.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => handleSmartSubmit(e, preset.prompt)}
                                disabled={isProcessing}
                                className="text-left px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all group"
                            >
                                <div className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{preset.label}</div>
                                <div className="text-[10px] text-slate-500 group-hover:text-indigo-500">{preset.desc}</div>
                            </button>
                        ))}
                     </div>
                 )}

                 {viewMode === 'cv' && (
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-2">Examples:</p>
                         <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                             <li>"Change my title to Senior Product Manager"</li>
                             <li>"Rewrite the summary to be more punchy"</li>
                             <li>"Add 'Python' to my skills"</li>
                         </ul>
                     </div>
                 )}
                 
                 <form onSubmit={(e) => handleSmartSubmit(e)} className="space-y-3 pt-2 border-t border-slate-100 mt-2 relative">
                     <p className="text-xs font-bold text-slate-400 uppercase">Custom Instruction</p>
                     
                     <div className="relative">
                        <textarea 
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none pb-10"
                            placeholder={viewMode === 'cv' ? "e.g. Change the second bullet..." : "e.g. Mention my passion for fintech..."}
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            disabled={isProcessing}
                        />
                        
                        {/* File Upload Trigger */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".pdf,.docx,.txt" 
                                    onChange={handleFileSelect} 
                                />
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isReadingFile || isProcessing}
                                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition-colors ${isReferenceUploadAllowed ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
                                    title={isReferenceUploadAllowed ? "Attach Reference PDF/DOCX" : "Available on Growth Plan+"}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    {isReadingFile ? "Reading..." : "Attach File"}
                                </button>
                                
                                {attachedFileName && (
                                    <div className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] px-2 py-0.5 rounded-full animate-fade-in max-w-[150px]">
                                        <span className="truncate">{attachedFileName}</span>
                                        <button type="button" onClick={removeAttachment} className="hover:text-green-900">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {!isReferenceUploadAllowed && (
                                <span className="text-[9px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Growth Plan</span>
                            )}
                        </div>
                     </div>

                     <Button 
                        type="submit" 
                        isLoading={isProcessing} 
                        disabled={!instruction.trim() && !extractedFileText}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                     >
                        Apply Changes
                     </Button>
                 </form>
             </div>
         ) : (
             <div className="space-y-4">
                 <p className="text-sm text-slate-600">Manual edits update your CV text directly without AI generation.</p>
                 
                 {viewMode === 'cv' ? (
                     <div className="space-y-4">
                        {formData && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                    <input className="w-full p-2 border rounded text-sm" value={formData.name} onChange={e => handleManualChange('name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                    <input className="w-full p-2 border rounded text-sm" value={formData.title} onChange={e => handleManualChange('title', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary</label>
                                    <textarea className="w-full p-2 border rounded text-sm h-32" value={formData.summary} onChange={e => handleManualChange('summary', e.target.value)} />
                                </div>
                            </>
                        )}
                     </div>
                 ) : (
                     <div className="space-y-4">
                        <textarea className="w-full p-3 border border-slate-300 rounded-lg text-sm h-[400px] focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed" value={manualCL} onChange={e => setManualCL(e.target.value)} />
                     </div>
                 )}

                 <Button onClick={handleManualSave} className="w-full bg-slate-800 hover:bg-slate-900">
                    Save Manual Edits
                 </Button>
             </div>
         )}
      </div>
    </div>
  );
};