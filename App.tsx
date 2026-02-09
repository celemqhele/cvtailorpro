
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Content } from './pages/Blog'; // Imports from renamed Content component file
import { ContentPost } from './pages/BlogPost'; // Imports from renamed ContentPost component file
import { Pricing } from './pages/Pricing';
import { Account } from './pages/Account';
import { Privacy } from './pages/Privacy';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        
        {/* Renamed Content Routes */}
        <Route path="/content" element={<Content />} />
        <Route path="/content/:slug" element={<ContentPost />} />
        
        {/* Legacy redirect support could be handled here if needed, but for SPA we just define new paths */}
        <Route path="/blog" element={<Content />} /> 
        <Route path="/blog/:slug" element={<ContentPost />} />

        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<Dashboard mode="user" />} />
        <Route path="/guestuserdashboard" element={<Dashboard mode="guest" />} />
        
        {/* Protected Pages (Layout handles auth state, Account checks user internally) */}
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  );
};
