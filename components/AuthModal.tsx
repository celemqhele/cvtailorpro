
import React, { useState } from 'react';
import { Button } from './Button';
import { authService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !termsAccepted) {
        setError("You must accept the Terms and Privacy Policy to create an account.");
        return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await authService.signUp(email, password);
        setShowVerification(true);
      } else {
        await authService.signIn(email, password, keepLoggedIn);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowVerification(false);
    setMode('signin');
    setError(null);
    setKeepLoggedIn(false);
    setTermsAccepted(false);
    onClose();
  };

  if (showVerification) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-8 relative text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your Inbox</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Account created successfully! We've sent a confirmation link to <strong className="text-slate-900">{email}</strong>.<br/><br/>
            Please confirm your email address to log in.
          </p>
          <Button 
            onClick={() => { setShowVerification(false); setMode('signin'); }} 
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-8 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          {mode === 'signin' ? 'Login to access your CV history and Pro features.' : 'Sign up to save your CVs and manage subscriptions.'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {mode === 'signin' && (
            <div className="flex items-center">
              <input
                id="keep-logged-in"
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="keep-logged-in" className="ml-2 block text-sm text-slate-700 cursor-pointer select-none">
                Keep me logged in
              </label>
            </div>
          )}

          {mode === 'signup' && (
             <div className="flex items-start">
              <input
                id="accept-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 mt-1 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="accept-terms" className="ml-2 block text-xs text-slate-600 cursor-pointer select-none">
                I acknowledge the <span className="underline">Privacy Policy</span> and agree to the <span className="underline">Terms and Conditions</span>.
              </label>
            </div>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="text-indigo-600 font-bold hover:underline"
          >
            {mode === 'signin' ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};
