import React, { useRef, useState } from 'react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (file: FileData | null) => void;
  selectedFileName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFileName }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Content = result.split(',')[1];
      
      onFileSelect({
        base64: base64Content,
        mimeType: file.type || 'text/plain',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-white'
      }`}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept=".doc,.docx,.txt,.pdf"
        onChange={handleChange}
      />
      
      <div className="flex flex-col items-center justify-center gap-3">
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        {selectedFileName ? (
          <div className="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 px-4 py-2 rounded-full">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {selectedFileName}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-lg font-medium text-slate-700">Upload your CV</p>
            <p className="text-sm text-slate-500">PDF (.pdf), Word (.docx) or Text (.txt)</p>
          </div>
        )}
      </div>
    </div>
  );
};