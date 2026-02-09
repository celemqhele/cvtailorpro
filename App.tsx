
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Pricing } from './pages/Pricing';
import { Account } from './pages/Account';
import { Privacy } from './pages/Privacy';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
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
