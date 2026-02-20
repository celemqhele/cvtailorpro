import React, { useState } from 'react';
import { Button } from './Button';
import { FileUpload } from './FileUpload';
import { FileData } from '../types';

interface QuickApplyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: FileData) => void;
  isLoading: boolean;
}

export const QuickApplyUploadModal: React.FC<QuickApplyUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpload, 
  isLoading 
}) => {
  const [file, setFile] = useState<FileData | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative border border-indigo-100">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            <h2 className="text-2xl font-bold relative z-10">Step 2: Fill the Gaps</h2>
            <p className="text-indigo-100 mt-2 relative z-10 text-sm">
                We've built the perfect structure. Now let's add your facts.
            </p>
            
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-8">
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Skeleton CV Generated!</h3>
                        <p className="text-sm text-slate-500">The ATS-optimized structure is ready.</p>
                    </div>
                </div>
                
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    Upload your current CV (PDF or Word). We will extract your dates, companies, and metrics to fill the placeholders in the new structure.
                </p>

                <FileUpload 
                    onFileSelect={setFile} 
                    selectedFileName={file?.name}
                />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 text-slate-500 font-medium hover:text-slate-700 text-sm"
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <Button 
                    onClick={handleConfirm}
                    disabled={!file || isLoading}
                    className={`flex-1 shadow-lg ${!file ? 'opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        "Generate Final CV"
                    )}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
