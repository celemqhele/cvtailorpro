
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Content } from './pages/Blog'; 
import { ContentPost } from './pages/BlogPost'; 
import { Pricing } from './pages/Pricing';
import { Account } from './pages/Account';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Terms } from './pages/Terms';
import { FindJobs } from './pages/FindJobs';
import { JobDetails } from './pages/JobDetails';
import { AdminJobs } from './pages/AdminJobs';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        
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
        
        {/* Protected Pages */}
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  );
};
