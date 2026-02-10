
import React from 'react';
import { Button } from './Button';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <div 
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col relative transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-800">Privacy Policy & Terms</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto text-slate-600 space-y-6 text-sm leading-relaxed">
          
          <section>
            <h4 className="font-bold text-slate-900 mb-2">1. Introduction & POPIA</h4>
            <p>
              By using CV Tailor Pro ("the Service"), you agree to these Terms and Conditions and Privacy Policy. We comply with the <strong>Protection of Personal Information Act (POPIA)</strong> of South Africa.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">2. Data Collection & Storage</h4>
            <p>We collect and store specific information to provide the Service:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>User Account Data:</strong> Name, email address, and encrypted password authentication data.</li>
              <li><strong>CV Data:</strong> We store the <strong>extracted text content</strong> of your most recently uploaded CV to facilitate auto-filling on your dashboard. We do not permanently store the original binary file.</li>
              <li><strong>Usage Data:</strong> Application history, including generated CV/Cover Letter content, is stored to allow you to view and restore your history.</li>
              <li><strong>Transaction Data:</strong> We store Order IDs and Subscription status. We do NOT store credit card numbers.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">3. Third-Party AI Processing</h4>
             <p>
              This service utilizes Third-Party Artificial Intelligence providers (specifically Cerebras AI) to process your data. By using this tool, you grant us permission to send your anonymized CV text and Job Descriptions to these providers for the sole purpose of content generation.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">4. Your Rights</h4>
            <p>
              Under POPIA, you have the right to access, correct, or request the deletion of your personal data held by us. You may delete your account at any time.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">5. Contact</h4>
            <p>
              Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-600 hover:underline">customerservice@goapply.co.za</a>.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  );
};
