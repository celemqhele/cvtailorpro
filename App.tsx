
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Pricing } from './pages/Pricing';
import { Account } from './pages/Account';
import { Privacy } from './pages/Privacy';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/account" element={<Account />} />
        <Route path="/privacy-policy" element={<Privacy />} />
      </Route>
    </Routes>
  );
};
