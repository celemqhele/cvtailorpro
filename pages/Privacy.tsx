
import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 border-b pb-4">Privacy Policy & Terms</h1>
        
        <div className="prose prose-slate max-w-none text-slate-600">
          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">1. Introduction & Acceptance</h3>
            <p>By using CV Tailor Pro ("the Service"), you agree to these Terms and Conditions and Privacy Policy.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">2. Data Collection & Storage</h3>
            <p>We collect and store specific information to provide the Service:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>User Account Data:</strong> Name, email address, and encrypted password authentication data.</li>
              <li><strong>Usage Data:</strong> Application history is stored to allow you to restore your history.</li>
              <li><strong>Uploaded Documents:</strong> Original files are processed in temporary memory. Extracted text is stored in history logs.</li>
              <li><strong>Transaction Data:</strong> We store Order IDs and Subscription status. We do NOT store credit card numbers.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">3. Third-Party AI Processing</h3>
             <p>This service utilizes Third-Party Artificial Intelligence providers (Cerebras AI) to process your data. You grant us permission to send your anonymized data to these providers for content generation.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">4. User Obligations</h3>
            <p>You agree not to upload sensitive personal data (e.g., ID numbers, health data) irrelevant to a job application.</p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-bold text-slate-800 mb-3">5. Contact</h3>
            <p>Questions? Contact us at <a href="mailto:customerservice@goapply.co.za" className="text-indigo-600 hover:underline">customerservice@goapply.co.za</a>.</p>
          </section>
        </div>
    </div>
  );
};
