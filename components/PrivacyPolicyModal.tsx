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
          <h3 className="text-xl font-bold text-slate-800">Privacy Policy</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto text-slate-600 space-y-6 text-sm leading-relaxed">
          
          <section>
            <h4 className="font-bold text-slate-900 mb-2">1. Introduction</h4>
            <p>
              Welcome to CV Tailor Pro ("we," "our," or "us"). We are committed to protecting your personal information.
              This policy explains how we handle your data when you use our CV tailoring service.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">2. Data Handling & Security</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>No Retention:</strong> We do not store your uploaded CVs or generated documents. Data is processed in-memory and discarded.</li>
              <li><strong>Processing:</strong> Data is transmitted securely to our AI providers (Cerebras) solely for generation purposes.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">3. Third-Party AI Services</h4>
             <p>
              We utilize Cerebras AI (powering models like Llama 3.3 70B) to process text. By using this tool, you acknowledge that your input data is sent to the Cerebras API.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">4. Contact</h4>
            <p>
              Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-600 hover:underline">customerservice@goapply.co.za</a>.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
          <Button onClick={onClose} variant="secondary">Close Policy</Button>
        </div>
      </div>
    </div>
  );
};