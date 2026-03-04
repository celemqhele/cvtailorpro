import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface LoadingProgressBarProps {
  isComplete: boolean;
  onCompleteAnimationFinished?: () => void;
  type?: 'cv' | 'skeleton';
}

export const LoadingProgressBar: React.FC<LoadingProgressBarProps> = ({ isComplete, onCompleteAnimationFinished, type = 'cv' }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(type === 'skeleton' ? "Analyzing job description..." : "Analyzing job requirements...");
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(100);
      setMessage(type === 'skeleton' ? "Skeleton Ready!" : "Complete! Loading your CV...");
      setShowCheckmark(true);
      
      const timer = setTimeout(() => {
        if (onCompleteAnimationFinished) {
          onCompleteAnimationFinished();
        }
      }, 1000); // Wait 1s for the user to see the 100% and checkmark
      return () => clearTimeout(timer);
    }

    // Phase 1: Fake Progress (0-90%) over 45 seconds
    const totalDuration = 45000;
    const updateInterval = 100; // Update every 100ms for smooth animation
    const steps = totalDuration / updateInterval;
    const incrementPerStep = 90 / steps;

    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += incrementPerStep;
      
      if (currentProgress >= 90) {
        currentProgress = 90;
        clearInterval(interval);
        setMessage(type === 'skeleton' ? "Finalizing skeleton structure..." : "Finalizing your tailored CV...");
      } else if (currentProgress < 30) {
        setMessage(type === 'skeleton' ? "Analyzing job description..." : "Analyzing job requirements...");
      } else if (currentProgress < 60) {
        setMessage(type === 'skeleton' ? "Architecting CV structure..." : "Matching your experience to role...");
      } else {
        setMessage(type === 'skeleton' ? "Optimizing for ATS keywords..." : "Optimizing keywords for ATS...");
      }
      
      setProgress(currentProgress);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isComplete, onCompleteAnimationFinished, type]);

  return (
    <div className="w-full max-w-md mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg border border-indigo-50">
      <div className="flex justify-between items-end mb-3">
        <span className="text-sm font-bold text-slate-700">{message}</span>
        <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
      </div>
      
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
        <motion.div 
          className="h-full bg-indigo-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>

      <AnimatePresence>
        {showCheckmark && (
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
