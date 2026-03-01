import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analyticsService';

export const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    // Global error listener
    const handleError = (event: ErrorEvent) => {
      analytics.logError(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.logError(`Unhandled Rejection: ${event.reason}`, event.reason?.stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // This component doesn't render anything
};
