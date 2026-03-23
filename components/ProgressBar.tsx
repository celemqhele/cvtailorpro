import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  isGenerating: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ isGenerating, label = "Generating your CV..." }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          // Slow down as it gets closer to 99
          const increment = prev < 50 ? 5 : prev < 80 ? 2 : prev < 95 ? 1 : prev < 99 ? 0.5 : 0;
          return Math.min(prev + increment, 99);
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
        <span>{label}</span>
        <span>{Math.floor(progress)}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
