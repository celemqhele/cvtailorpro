
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Button } from '../components/Button';

export const Account: React.FC = () => {
  const { user, checkUserSession, triggerPayment } = useOutletContext<any>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription'>('profile');
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user) {
        navigate('/'); // Redirect if not logged in
        return;
    }
    setFullName(user.full_name || '');
    setNewEmail(user.email || '');
  }, [user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updateProfileName(fullName);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      checkUserSession();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Changing email requires verification. Continue?")) return;
    setIsLoading(true);
    setMessage(null);
    try {
      await authService.updateEmail(newEmail);
      setMessage({ type: 'success', text: 'Confirmation link sent.' });
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

  const handleSignOut = async () => {
      await authService.signOut();
      checkUserSession();
      navigate('/');
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Account Settings</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
            {/* Sidebar */}
            <div className="w-full md:w-1/4 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                <nav className="space-y-2 flex-1">
                    {['profile', 'security', 'subscription'].map((tab) => (
                        <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                        {tab}
                        </button>
                    ))}
                </nav>
                <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2 mt-8 md:mt-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                </button>
            </div>

            {/* Content */}
            <div className="w-full md:w-3/4 p-8">
                {message && (
                    <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                    <h2 className="text-xl font-bold">Public Profile</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <Button type="submit" isLoading={isLoading} className="bg-indigo-600">Save Changes</Button>
                    </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-8">
                        <div className="space-y-4 max-w-md border-b border-slate-100 pb-6">
                            <h2 className="text-xl font-bold">Email Address</h2>
                            <form onSubmit={handleUpdateEmail} className="space-y-4">
                                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none" />
                                <Button type="submit" isLoading={isLoading} variant="secondary">Update Email</Button>
                            </form>
                        </div>
                        <div className="space-y-4 max-w-md">
                            <h2 className="text-xl font-bold">Change Password</h2>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none" />
                                <Button type="submit" isLoading={isLoading} className="bg-slate-800">Set New Password</Button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'subscription' && (
                     <div className="space-y-6">
                        <h2 className="text-xl font-bold">Subscription Status</h2>
                        <div className={`p-6 rounded-xl border-2 ${user.is_pro_plus ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-bold text-lg text-slate-800">Current Plan</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.is_pro_plus ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                                    {user.is_pro_plus ? 'Pro Plus Active' : 'Free Tier'}
                                </span>
                            </div>
                            {user.is_pro_plus ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-700">Your subscription is active. Expires: {new Date(user.subscription_end_date!).toLocaleDateString()}</p>
                                    <Button onClick={() => triggerPayment()} variant="primary" className="w-full bg-indigo-600">Extend Access</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-600">Upgrade to remove ads and unlock unlimited downloads.</p>
                                    <Button onClick={() => triggerPayment()} className="w-full bg-indigo-600">Upgrade to Pro Plus</Button>
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
