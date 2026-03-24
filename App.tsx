
/** Updated: 2026-03-06 */
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { Loader2 } from 'lucide-react';

// Eagerly load the Home page for fastest LCP
import { Home } from './pages/Home';

// Lazy load all other pages
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Content = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.Content })));
const ContentPost = React.lazy(() => import('./pages/BlogPost').then(m => ({ default: m.ContentPost })));
const Pricing = React.lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Account = React.lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const Privacy = React.lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const About = React.lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = React.lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Terms = React.lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const FindJobs = React.lazy(() => import('./pages/FindJobs').then(m => ({ default: m.FindJobs })));
const JobDetails = React.lazy(() => import('./pages/JobDetails').then(m => ({ default: m.JobDetails })));
const AdminJobs = React.lazy(() => import('./pages/AdminJobs').then(m => ({ default: m.AdminJobs })));
const GeneratedCV = React.lazy(() => import('./pages/GeneratedCV').then(m => ({ default: m.GeneratedCV })));
const RecruiterHome = React.lazy(() => import('./pages/RecruiterHome').then(m => ({ default: m.RecruiterHome })));
const RecruiterDashboard = React.lazy(() => import('./pages/RecruiterDashboard').then(m => ({ default: m.RecruiterDashboard })));
const WhyUs = React.lazy(() => import('./pages/WhyUs').then(m => ({ default: m.WhyUs })));
const ThankYou = React.lazy(() => import('./pages/ThankYou').then(m => ({ default: m.ThankYou })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminLeads = React.lazy(() => import('./pages/AdminLeads').then(m => ({ default: m.AdminLeads })));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
  </div>
);

export const App: React.FC = () => {
  return (
    <>
      <AnalyticsTracker />
      <Routes>
      <Route element={<Layout />}>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        
        {/* Lazy Loaded Routes */}
        <Route path="*" element={
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/recruiter" element={<RecruiterHome />} />
              <Route path="/why-us" element={<WhyUs />} />
              
              {/* Content Routes */}
              <Route path="/content" element={<Content />} />
              <Route path="/content/:slug" element={<ContentPost />} />
              
              {/* Legacy redirect support */}
              <Route path="/blog" element={<Content />} /> 
              <Route path="/blog/:slug" element={<ContentPost />} />

              {/* Job Board Routes */}
              <Route path="/find-jobs" element={<FindJobs />} />
              <Route path="/find-jobs/:id" element={<JobDetails />} />
              <Route path="/admin-jobs" element={<AdminJobs />} />

              <Route path="/pricing" element={<Pricing />} />
              
              {/* Legal & Support Pages */}
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/terms-and-conditions" element={<Terms />} />
              <Route path="/about-us" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<Dashboard mode="user" />} />
              <Route path="/guestuserdashboard" element={<Dashboard mode="guest" />} />
              <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
              
              {/* Generated CV View (Protected by RLS mainly, but route is open) */}
              <Route path="/cv-generated/:id" element={<GeneratedCV />} />
              
              {/* Post-Purchase Page */}
              <Route path="/thank-you" element={<ThankYou />} />

              {/* Admin Routes */}
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin-leads" element={<AdminLeads />} />

              {/* Protected Pages */}
              <Route path="/account" element={<Account />} />
            </Routes>
          </Suspense>
        } />
      </Route>
    </Routes>
    </>
  );
};
 