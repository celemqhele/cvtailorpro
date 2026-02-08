
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { Button } from './Button';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onProfileUpdate: () => void;
  onUpgradeClick: () => void;
}

type Tab = 'profile' | 'security' | 'subscription';

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose, user, onProfileUpdate, onUpgradeClick }) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form States
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setNewEmail(user.email || '');
      setNewPassword('');
      setMessage(null);
      setActiveTab('profile');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updateProfileName(fullName);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      onProfileUpdate(); // Refresh parent state
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Changing your email will require you to verify the new address via a link sent to your inbox. Continue?")) return;
    
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updateEmail(newEmail);
      setMessage({ type: 'success', text: 'Confirmation link sent to both old and new email addresses.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updatePassword(newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!user?.subscription_end_date) return 0;
    const end = new Date(user.subscription_end_date);
    const now = new Date();
    if (end < now) return 0;
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Settings</h3>
          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Security
            </button>
            <button 
              onClick={() => setActiveTab('subscription')}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subscription' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Subscription
            </button>
          </nav>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-2 mt-auto">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             Back to App
          </button>
        </div>

        {/* Content Area */}
        <div className="w-2/3 p-8 overflow-y-auto">
          {message && (
            <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Public Profile</h2>
                <p className="text-sm text-slate-500">Update how your name appears on your account.</p>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                   <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. John Doe"
                   />
                </div>
                <Button type="submit" isLoading={isLoading} className="bg-indigo-600 hover:bg-indigo-700">Save Changes</Button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
               {/* Email Section */}
               <div className="space-y-4 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Email Address</h2>
                    <p className="text-sm text-slate-500">Update your login email.</p>
                  </div>
                  <form onSubmit={handleUpdateEmail} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input 
                          type="email" 
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <Button type="submit" isLoading={isLoading} variant="secondary">Update Email</Button>
                  </form>
               </div>

               {/* Password Section */}
               <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
                    <p className="text-sm text-slate-500">Ensure your account uses a strong password.</p>
                  </div>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                      <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Min 6 characters"
                          minLength={6}
                      />
                    </div>
                    <Button type="submit" isLoading={isLoading} className="bg-slate-800 hover:bg-slate-900">Set New Password</Button>
                  </form>
               </div>
            </div>
          )}

          {activeTab === 'subscription' && (
             <div className="space-y-6">
               <div>
                  <h2 className="text-xl font-bold text-slate-900">Subscription Status</h2>
                  <p className="text-sm text-slate-500">Manage your Pro Plus access.</p>
               </div>
               
               <div className={`p-6 rounded-xl border-2 ${user.is_pro_plus ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-lg text-slate-800">Current Plan</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.is_pro_plus ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                          {user.is_pro_plus ? 'Pro Plus Active' : 'Free Tier'}
                      </span>
                  </div>
                  
                  {user.is_pro_plus ? (
                     <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">Your subscription is active and gives you unlimited downloads and ad-free access.</p>
                            <p className="text-sm font-bold text-green-700">Days Remaining: {getDaysRemaining()}</p>
                            <p className="text-xs text-slate-500">
                            Note: Subscriptions do not auto-renew.
                            </p>
                        </div>
                        <Button onClick={onUpgradeClick} variant="primary" className="w-full bg-indigo-600 hover:bg-indigo-700">
                           Extend Subscription
                        </Button>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <p className="text-sm text-slate-600">You are currently on the free tier. Upgrade to remove ads and unlock unlimited downloads.</p>
                        <ul className="space-y-2 text-sm text-slate-700">
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Unlimited Word (.docx) Downloads
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Ad-Free Experience
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Priority Processing
                            </li>
                        </ul>
                        <Button onClick={onUpgradeClick} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md">
                           Upgrade to Pro Plus
                        </Button>
                     </div>
                  )}
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
