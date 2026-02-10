
import React, { useState, useEffect } from 'react';

interface CreditCountdownProps {
  initialSecondsLeft: number; // Came from Server
  onReset: () => void;
  className?: string;
}

export const CreditCountdown: React.FC<CreditCountdownProps> = ({ initialSecondsLeft, onReset, className = '' }) => {
  const [seconds, setSeconds] = useState(initialSecondsLeft);

  useEffect(() => {
    setSeconds(initialSecondsLeft);
  }, [initialSecondsLeft]);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onReset]);

  // Don't show if timer is invalid or extremely long (error state)
  if (seconds <= 0 || isNaN(seconds)) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${className}`}>
      <span className="text-slate-400">Refills:</span>
      <span className="font-mono text-slate-600">{timeString}</span>
    </div>
  );
};
