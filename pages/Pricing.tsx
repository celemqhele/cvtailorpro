import React, { useState } from 'react';
import { PLANS, createSubscription } from '../services/subscriptionService';
import { PaymentModal } from '../components/DonationModal';

export const Pricing: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  
  // Reuse the logic from the modal component but display it inline
  const handleSuccess = (id: string, isSub: boolean) => {
    alert(`Success! Plan activated. ID: ${id}. Go to Home to use it.`);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-slate-600">Choose the plan that best fits your job search needs.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Single Unlock */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 p-8 flex flex-col hover:border-indigo-200 transition-colors">
          <div className="mb-4">
             <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Pay As You Go</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Single Application</h3>
          <div className="text-4xl font-extrabold text-slate-900 mb-6">R20</div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-slate-700">
               <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               Tailored CV Word Document
            </li>
            <li className="flex items-center gap-3 text-slate-700">
               <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               Tailored Cover Letter
            </li>
            <li className="flex items-center gap-3 text-slate-400">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               Includes Ads on Page
            </li>
          </ul>
          
          <button onClick={() => setShowModal(true)} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">
            Get Single Unlock
          </button>
        </div>

        {/* Pro Plus */}
        <div className="bg-indigo-50 rounded-2xl shadow-xl border-2 border-indigo-500 p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-400 text-white text-xs font-bold px-4 py-1 rounded-bl-xl uppercase">
             Best Value
          </div>
          <div className="mb-4">
             <span className="bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Pro Plus</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">30 Days Unlimited</h3>
          <div className="text-4xl font-extrabold text-indigo-600 mb-6">R99</div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-slate-700">
               <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               <strong>Unlimited</strong> CV & Cover Letters
            </li>
            <li className="flex items-center gap-3 text-slate-700">
               <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               <strong>Zero Ads</strong> (Ad-Free Experience)
            </li>
            <li className="flex items-center gap-3 text-slate-700">
               <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               Word & PDF Downloads
            </li>
          </ul>
          
          <button onClick={() => setShowModal(true)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Subscribe Now
          </button>
        </div>
      </div>

      <PaymentModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={handleSuccess} 
        documentTitle="Pro Access" 
        existingOrderId={null} 
      />
    </div>
  );
};