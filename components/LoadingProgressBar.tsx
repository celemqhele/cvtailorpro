import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface LoadingProgressBarProps {
  isComplete: boolean;
  onCompleteAnimationFinished?: () => void;
  type?: 'cv' | 'skeleton';
  startTime?: number; // Optional timestamp when job started
  progress?: number; // Optional real progress (0-100)
}

export const LoadingProgressBar: React.FC<LoadingProgressBarProps> = ({ isComplete, onCompleteAnimationFinished, type = 'cv', startTime, progress: externalProgress }) => {
  const [simulatedProgress, setSimulatedProgress] = useState(() => {
      if (startTime) {
          const elapsed = Date.now() - startTime;
          return Math.min(90, (elapsed / 45000) * 90);
      }
      return 0;
  });
  const isExternal = typeof externalProgress === 'number';
  let currentProgress = isExternal ? Math.min(95, Math.max(0, externalProgress!)) : simulatedProgress;
  
  if (isComplete) {
      currentProgress = 100;
  }

  let message = type === 'skeleton' ? "Analyzing job description..." : "Analyzing job requirements...";
  if (isComplete) {
      message = type === 'skeleton' ? "Skeleton Ready!" : "Complete! Loading your CV...";
  } else if (currentProgress < 30) {
      message = type === 'skeleton' ? "Analyzing job description..." : "Analyzing job requirements...";
  } else if (currentProgress < 60) {
      message = type === 'skeleton' ? "Architecting CV structure..." : "Matching your experience to role...";
  } else {
      message = type === 'skeleton' ? "Optimizing for ATS keywords..." : "Finalizing your tailored CV...";
  }

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        if (onCompleteAnimationFinished) {
          onCompleteAnimationFinished();
        }
      }, 1000); 
      return () => clearTimeout(timer);
    }

    if (isExternal) return;

    const totalDuration = 45000;
    const updateInterval = 100;
    
    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= 90) return 90;
        const increment = 90 / (totalDuration / updateInterval);
        return Math.min(90, prev + increment);
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isComplete, isExternal, onCompleteAnimationFinished]);

  return (
    <div className="w-full max-w-md mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg border border-indigo-50">
      <div className="flex justify-between items-end mb-3">
        <span className="text-sm font-bold text-slate-700">{message}</span>
        <span className="text-sm font-bold text-indigo-600">{Math.round(currentProgress)}%</span>
      </div>
      
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
        <motion.div 
          className="h-full bg-indigo-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mt-4 text-green-600 font-bold"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>Success!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
