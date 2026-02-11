import React, { useState } from 'react';
import { Button } from './Button';
import { CVData } from '../types';

interface SmartEditorProps {
  cvData: CVData;
  onSmartEdit: (instruction: string) => Promise<void>;
  onManualUpdate: (updatedData: CVData) => void;
  isLocked: boolean;
  onUnlock: () => void;
  isProcessing: boolean;
}

export const SmartEditor: React.FC<SmartEditorProps> = ({ 
  cvData, 
  onSmartEdit, 
  onManualUpdate,
  isLocked, 
  onUnlock,
  isProcessing 
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [instruction, setInstruction] = useState('');
  
  // Manual Form State
  const [formData, setFormData] = useState<CVData>({ ...cvData });

  // Update form data when cvData prop changes (e.g. after AI edit)
  React.useEffect(() => {
    setFormData({ ...cvData });
  }, [cvData]);

  const handleSmartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
        onUnlock();
        return;
    }
    if (!instruction.trim()) return;
    onSmartEdit(instruction);
    setInstruction('');
  };

  const handleManualChange = (field: keyof CVData, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const handleManualSave = () => {
    if (isLocked) {
        onUnlock();
        return;
    }
    onManualUpdate(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-full flex flex-col overflow-hidden sticky top-20 max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 text-white shrink-0">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Smart Editor
              </h3>
              <span className="bg-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-indigo-400">Pro</span>
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
                     Tell the AI what to change. It will preserve your format and update the content.
                 </p>
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Examples:</p>
                     <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                         <li>"Change my title to Senior Product Manager"</li>
                         <li>"Rewrite the summary to be more punchy and focus on leadership"</li>
                         <li>"Add 'Python' and 'AWS' to my skills"</li>
                         <li>"Fix the typo in the first job description"</li>
                     </ul>
                 </div>
                 
                 <form onSubmit={handleSmartSubmit} className="space-y-3 pt-2">
                     <textarea 
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="e.g. Change the second bullet of my last job to..."
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        disabled={isProcessing}
                     />
                     <Button 
                        type="submit" 
                        isLoading={isProcessing} 
                        disabled={!instruction.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                     >
                        Apply Changes
                     </Button>
                 </form>
             </div>
         ) : (
             <div className="space-y-4">
                 <div className="space-y-3">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.name}
                            onChange={(e) => handleManualChange('name', e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.title}
                            onChange={(e) => handleManualChange('title', e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.email}
                            onChange={(e) => handleManualChange('email', e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.phone}
                            onChange={(e) => handleManualChange('phone', e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            value={formData.summary}
                            onChange={(e) => handleManualChange('summary', e.target.value)}
                        />
                     </div>
                 </div>
                 
                 <div className="pt-2 border-t border-slate-100">
                     <p className="text-xs text-slate-400 mb-3 italic">
                        Note: For complex edits like bullet points or skills, please use the <strong>AI Assistant</strong> tab.
                     </p>
                     <Button onClick={handleManualSave} isLoading={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900">
                        Save Manual Changes
                     </Button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};