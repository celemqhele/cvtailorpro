import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Pricing } from './pages/Pricing';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Terms } from './pages/Terms';
import { BlogIndex } from './pages/Blog/BlogIndex';
import { BlogPost } from './pages/Blog/BlogPost';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Navbar />
        
        <main className="flex-grow">
          <Routes>
            {/* Marketing / Landing Page */}
            <Route path="/" element={<Home />} />
            
            {/* Functional App Dashboard */}
            <Route path="/app" element={<Dashboard />} />
            
            {/* Static Content Pages */}
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Dynamic Content Routes */}
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;