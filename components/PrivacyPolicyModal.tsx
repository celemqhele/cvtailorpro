import React from 'react';
import { Button } from './Button';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  // We keep the component rendered but hidden when closed to ensure the Ezoic embed span 
  // exists in the DOM for their script to find/populate it.
  
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
              Welcome to CV Tailor Pro ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
              This policy explains how we handle your data when you use our CV tailoring service.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">2. Data Handling & Security (CVs and Job Specs)</h4>
            <p className="mb-2">
              <strong>We do not store your personal documents.</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Processing:</strong> When you upload a CV or paste a job description, the data is transmitted securely via encryption to our AI processing partner (Cerebras/Llama models) solely for the purpose of generating your tailored content.
              </li>
              <li>
                <strong>No Retention:</strong> Once the tailored CV/Cover Letter is generated and returned to your browser, the data is discarded. We do not maintain a database of user CVs.
              </li>
              <li>
                <strong>Local Storage:</strong> The tailored documents are generated in your browser memory. If you refresh the page, your data is lost, as we do not save it to a server.
              </li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">3. Advertising and Cookies (Ezoic)</h4>
            <p className="mb-2">
              This website uses Ezoic Inc. ("Ezoic") to manage and display third-party advertisements. Ezoic may use cookies and similar tracking technologies to collect information about your visit to this website to provide personalized advertisements.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Third-Party Vendors:</strong> Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.
              </li>
              <li>
                <strong>Data Collection:</strong> Ezoic may collect data such as your IP address, browser type, and browsing behavior to optimize ad delivery.
              </li>
              <li>
                <strong>Your Rights:</strong> You can manage your privacy settings and opt-out of personalized advertising via the Ezoic privacy settings link usually found in the footer of this site or by visiting <a href="http://www.aboutads.info/choices/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">www.aboutads.info/choices/</a>.
              </li>
            </ul>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h5 className="font-bold text-slate-700 mb-2">Ezoic Privacy Policy</h5>
                <p className="text-xs mb-3 text-slate-500">The following content is embedded from Ezoic's compliance platform:</p>
                
                {/* Ezoic Embed Span - Must be present in DOM for script to find it */}
                <div className="text-xs text-slate-600 leading-normal">
                   <span id="ezoic-privacy-policy-embed"></span>
                </div>

                <p className="mt-4 text-xs text-slate-400 border-t border-slate-200 pt-2">
                    If the embedded policy above does not load, please view the full disclosures directly at: <br/>
                    <a href="http://g.ezoic.net/privacy/goapply.co.za" target="_blank" rel="noreferrer" className="text-indigo-600 underline break-all">http://g.ezoic.net/privacy/goapply.co.za</a>
                </p>
            </div>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">4. Third-Party AI Services</h4>
            <p>
              We utilize Cerebras AI (running Llama 3.1 models) to process your text. By using this tool, you acknowledge that your input data (CV text and Job Description) is sent to the Cerebras API for processing. Please refer to Cerebras's privacy policy for details on how they handle API data transit.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-slate-900 mb-2">5. Contact Us</h4>
            <p>
              If you have questions about this privacy policy, please contact us at privacy@cvtailor.pro.
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
