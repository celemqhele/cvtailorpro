import React, { useState, useEffect, useRef } from 'react';

interface GenerationProgressBarProps {
  isActive: boolean;
  onComplete?: () => void;
}

const PROGRESS_STAGES = [
  { targetPercent: 30, message: "Analyzing job requirements...", duration: 15000 },
  { targetPercent: 60, message: "Matching your experience to role...", duration: 15000 },
  { targetPercent: 90, message: "Optimizing keywords for ATS...", duration: 15000 },
];

const FINAL_WAIT_MESSAGE = "Finalizing your tailored CV...";

export const GenerationProgressBar: React.FC<GenerationProgressBarProps> = ({ isActive, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(PROGRESS_STAGES[0].message);
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      // Reset when deactivated
      setProgress(0);
      setMessage(PROGRESS_STAGES[0].message);
      setIsComplete(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const totalFakeDuration = PROGRESS_STAGES.reduce((sum, s) => sum + s.duration, 0); // 45s

      if (elapsed < totalFakeDuration) {
        // Phase 1: Fake progress 0-90%
        let accumulatedTime = 0;
        let currentProgress = 0;
        let prevPercent = 0;

        for (const stage of PROGRESS_STAGES) {
          if (elapsed < accumulatedTime + stage.duration) {
            // We're in this stage
            const stageElapsed = elapsed - accumulatedTime;
            const stageProgress = stageElapsed / stage.duration;
            // Use easeInOut for smooth animation
            const eased = stageProgress < 0.5
              ? 2 * stageProgress * stageProgress
              : 1 - Math.pow(-2 * stageProgress + 2, 2) / 2;
            currentProgress = prevPercent + eased * (stage.targetPercent - prevPercent);
            setMessage(stage.message);
            break;
          }
          accumulatedTime += stage.duration;
          prevPercent = stage.targetPercent;
          currentProgress = stage.targetPercent;
        }

        setProgress(currentProgress);
      } else {
        // Phase 2: Waiting at 90%, slow crawl to 95% over 30s
        const waitElapsed = elapsed - totalFakeDuration;
        const waitProgress = Math.min(waitElapsed / 30000, 1); // 30s max wait
        const crawl = 90 + waitProgress * 5; // 90% -> 95%
        setProgress(crawl);
        setMessage(FINAL_WAIT_MESSAGE);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  // When parent signals completion (isActive goes from true to false after success)
  const completeGeneration = () => {
    setProgress(100);
    setIsComplete(true);
    setMessage("Complete! Loading your CV...");
    if (onComplete) {
      setTimeout(onComplete, 500);
    }
  };

  // Expose complete method via ref pattern
  useEffect(() => {
    if (!isActive && progress > 0 && !isComplete) {
      // Generation finished - animate to 100%
      completeGeneration();
    }
  }, [isActive]);

  if (!isActive && progress === 0) return null;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-lg shadow-slate-100 animate-fade-in">
      {/* Status Message */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
          <div>
            <p className={`text-sm font-bold ${isComplete ? 'text-green-700' : 'text-slate-800'}`}>
              {message}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isComplete ? 'Redirecting...' : 'Please do not close this page'}
            </p>
          </div>
        </div>
        <span className="text-lg font-black text-slate-900 tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isComplete
              ? 'bg-green-500'
              : progress > 60
              ? 'bg-indigo-600'
              : 'bg-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage Indicators */}
      <div className="flex justify-between mt-3 px-1">
        <span className={`text-[10px] font-bold ${progress >= 30 ? 'text-indigo-600' : 'text-slate-300'}`}>
          Analyzing
        </span>
        <span className={`text-[10px] font-bold ${progress >= 60 ? 'text-indigo-600' : 'text-slate-300'}`}>
          Matching
        </span>
        <span className={`text-[10px] font-bold ${progress >= 90 ? 'text-indigo-600' : 'text-slate-300'}`}>
          Optimizing
        </span>
        <span className={`text-[10px] font-bold ${isComplete ? 'text-green-600' : 'text-slate-300'}`}>
          Complete
        </span>
      </div>
    </div>
  );
};
