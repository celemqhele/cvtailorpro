import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../constants';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? "text-indigo-600 font-bold" : "text-slate-600 hover:text-indigo-600";
  const mobileLinkClass = "block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600";

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 rounded-lg shadow-md">
                 <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <span className="font-bold text-xl text-slate-900">{APP_NAME}</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={isActive('/')}>Home</Link>
            <Link to="/app" className={isActive('/app')}>Dashboard</Link>
            <Link to="/about" className={isActive('/about')}>About</Link>
            <Link to="/pricing" className={isActive('/pricing')}>Pricing</Link>
            <Link to="/blog" className={isActive('/blog')}>Blog</Link>
          </div>

          <div className="hidden md:flex items-center">
             <Link to="/app">
                <Button className="py-2 px-4 text-sm h-auto bg-indigo-600 hover:bg-indigo-700">Get Started</Button>
             </Link>
          </div>

          {/* Mobile Button */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-xl absolute w-full z-40">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link to="/" onClick={() => setIsOpen(false)} className={mobileLinkClass}>Home</Link>
            <Link to="/app" onClick={() => setIsOpen(false)} className={mobileLinkClass}>Dashboard</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className={mobileLinkClass}>About</Link>
            <Link to="/pricing" onClick={() => setIsOpen(false)} className={mobileLinkClass}>Pricing</Link>
            <Link to="/blog" onClick={() => setIsOpen(false)} className={mobileLinkClass}>Blog</Link>
            <Link to="/contact" onClick={() => setIsOpen(false)} className={mobileLinkClass}>Contact</Link>
          </div>
        </div>
      )}
    </nav>
  );
};